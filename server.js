// ============================================
// AYUFRESH — Full Stack Server (sql.js)
// ============================================
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const nodemailer = require('nodemailer');

// 🔥 CHANGE 7 — Razorpay added
const Razorpay = require("razorpay");
const razorpay = new Razorpay({
  key_id: "YOUR_KEY",
  key_secret: "YOUR_SECRET"
});

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'ayufresh.db');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 🔥 FIX — default route (homepage)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});
// 🔥 PAGE ROUTES

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'contact.html'));
});

app.get('/order', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'order.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});
// 🔥 FIX — serve frontend files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views'))); // 🔥 ADD THIS LINE

let db;

async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL,
    address TEXT NOT NULL, city TEXT NOT NULL, state TEXT DEFAULT 'Maharashtra',
    pin TEXT NOT NULL, quantity INTEGER DEFAULT 1, total REAL NOT NULL,
    payment TEXT NOT NULL, status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 🔥 CHANGE 1 — Add payment_status column
  try {
    db.run(`ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending'`);
  } catch (e) {}

  // 🔥 CHANGE 6 — Reviews table
  db.run(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    review TEXT,
    rating INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    email TEXT NOT NULL, phone TEXT, subject TEXT,
    message TEXT NOT NULL, read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  saveDB();
  console.log('✅ Database ready');
}

function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  return queryAll(sql, params)[0] || null;
}

function runSql(sql, params = []) {
  db.run(sql, params);
  saveDB();
}

// ══════ API — Orders ══════
app.post('/api/orders', async (req, res) => {
  try {
    const { name, phone, email, address, city, state, pin, quantity, payment } = req.body;

    const order_id = "AYU-" + Date.now();
    const qty = parseInt(quantity) || 1;

    // 🔥 CHANGE 2 — Delivery + Total Calculation
    const price = 249;
    const delivery = (state === "Maharashtra") ? 50 : 70;
    const total = (qty * price) + delivery;

    // 🔥 CHANGE 3 — Updated INSERT
    runSql(
      `INSERT INTO orders (order_id,name,phone,email,address,city,state,pin,quantity,total,payment,payment_status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        order_id, name, phone, email, address, city,
        state || 'Maharashtra', pin, qty, total, payment,
        payment === "COD" ? "pending" : "paid"
      ]
    );

    // 🔥 CHANGE 4 — Return delivery also
    res.json({ success: true, order_id, total, delivery });

  } catch (err) {
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// 🔥 CHANGE 7 — Razorpay API
app.post("/api/create-payment", async (req, res) => {
  const options = {
    amount: req.body.amount * 100,
    currency: "INR"
  };
  const order = await razorpay.orders.create(options);
  res.json(order);
});

// 🔥 CHANGE 5 — Order Tracking
app.get("/api/track/:id", (req, res) => {
  const order = queryOne(
    "SELECT * FROM orders WHERE order_id=?",
    [req.params.id]
  );

  if (!order) return res.status(404).json({ error: "Order not found" });

  res.json(order);
});

// 🔥 CHANGE 6 — Reviews APIs
app.post("/api/review", (req, res) => {
  runSql(
    "INSERT INTO reviews (name, review, rating) VALUES (?,?,?)",
    [req.body.name, req.body.review, req.body.rating]
  );
  res.json({ success: true });
});

app.get("/api/reviews", (req, res) => {
  res.json(queryAll("SELECT * FROM reviews ORDER BY created_at DESC"));
});

// 🔥 ADMIN LOGIN API (MISSING FIX)
app.post('/api/admin/login', (req, res) => {
  const enteredPassword = req.body.password;

  console.log("Entered password:", enteredPassword); // debug

  if (enteredPassword === 'ayufresh2026') {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// ── Start ──
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`🔑 Password: ayufresh2026`);
  });
});