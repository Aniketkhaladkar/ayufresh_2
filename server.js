// ============================================
// AYUFRESH — Full Stack Server (sql.js)
// ============================================
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const nodemailer = require('nodemailer');

// 🔥 Razorpay (uncomment and add real keys when ready)
// const Razorpay = require("razorpay");
// const razorpay = new Razorpay({
//   key_id: "YOUR_KEY",
//   key_secret: "YOUR_SECRET"
// });

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'ayufresh.db');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ══════ PAGE ROUTES ══════
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

app.get('/order-success', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'order-success.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/track', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'track.html'));
});

// Policy pages
app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'privacy-policy.html'));
});
app.get('/terms-and-conditions', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'terms-and-conditions.html'));
});
app.get('/shipping-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'shipping-policy.html'));
});
app.get('/refund-and-cancellation', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'refund-and-cancellation.html'));
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

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
    payment_status TEXT DEFAULT 'pending',
    delivery_partner TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add columns if they don't exist (for existing DBs)
  try { db.run(`ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending'`); } catch (e) {}
  try { db.run(`ALTER TABLE orders ADD COLUMN delivery_partner TEXT DEFAULT ''`); } catch (e) {}

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

    const price = 249;
    const delivery = (state === "Maharashtra") ? 50 : 70;

    // Offer logic: Buy 2 @ ₹399
    let productTotal = (qty === 2) ? 399 : qty * price;
    const total = productTotal + delivery;

    runSql(
      `INSERT INTO orders (order_id,name,phone,email,address,city,state,pin,quantity,total,payment,payment_status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        order_id, name, phone, email, address, city,
        state || 'Maharashtra', pin, qty, total, payment,
        payment === "cod" ? "pending" : "paid"
      ]
    );

    res.json({ success: true, order_id, total, delivery });

  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// ══════ API — Razorpay Payment ══════
app.post("/api/create-payment", async (req, res) => {
  try {
    // Uncomment when Razorpay is configured:
    // const options = {
    //   amount: req.body.amount * 100,
    //   currency: "INR"
    // };
    // const order = await razorpay.orders.create(options);
    // res.json(order);

    // Placeholder response until Razorpay is configured
    res.status(503).json({ error: 'Razorpay not configured yet. Use COD.' });
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ error: 'Payment creation failed' });
  }
});

// ══════ API — Order Tracking ══════
app.get("/api/track/:id", (req, res) => {
  const order = queryOne(
    "SELECT * FROM orders WHERE order_id=?",
    [req.params.id]
  );
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

// ══════ API — Reviews ══════
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

// ══════ API — Contacts (PUBLIC) ══════
app.post('/api/contacts', (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email and message are required' });
    }
    runSql(
      'INSERT INTO contacts (name, email, phone, subject, message) VALUES (?,?,?,?,?)',
      [name, email, phone || '', subject || '', message]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Contact error:', err);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// ══════ API — Admin Login ══════
app.post('/api/admin/login', (req, res) => {
  const enteredPassword = req.body.password;
  const adminPassword = process.env.ADMIN_PASSWORD || 'ayufresh2026';

  if (enteredPassword === adminPassword) {
    res.json({ success: true, token: 'ayufresh-admin-' + Date.now() });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// ══════ API — Admin Stats ══════
app.get('/api/admin/stats', (req, res) => {
  try {
    const totalOrders = queryOne('SELECT COUNT(*) as c FROM orders')?.c || 0;
    const totalRevenue = queryOne('SELECT COALESCE(SUM(total),0) as s FROM orders WHERE status != "cancelled"')?.s || 0;
    const pendingOrders = queryOne('SELECT COUNT(*) as c FROM orders WHERE status = "pending"')?.c || 0;
    const unreadContacts = queryOne('SELECT COUNT(*) as c FROM contacts WHERE read = 0')?.c || 0;

    res.json({ totalOrders, totalRevenue, pendingOrders, unreadContacts });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// ══════ API — Admin Orders ══════
app.get('/api/admin/orders', (req, res) => {
  try {
    const orders = queryAll('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(orders);
  } catch (err) {
    console.error('Admin orders error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

app.patch('/api/admin/orders/:id', (req, res) => {
  try {
    const { status, delivery_partner } = req.body;
    if (status) {
      runSql('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    }
    if (delivery_partner !== undefined) {
      runSql('UPDATE orders SET delivery_partner = ? WHERE id = ?', [delivery_partner, req.params.id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

app.delete('/api/admin/orders/:id', (req, res) => {
  try {
    runSql('DELETE FROM orders WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// ══════ API — Admin Contacts ══════
app.get('/api/admin/contacts', (req, res) => {
  try {
    const contacts = queryAll('SELECT * FROM contacts ORDER BY created_at DESC');
    res.json(contacts);
  } catch (err) {
    console.error('Admin contacts error:', err);
    res.status(500).json({ error: 'Failed to load contacts' });
  }
});

app.patch('/api/admin/contacts/:id/read', (req, res) => {
  try {
    runSql('UPDATE contacts SET read = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// ══════ API — Invoice (Simple Text) ══════
app.get('/api/invoice/:orderId', (req, res) => {
  try {
    const order = queryOne('SELECT * FROM orders WHERE order_id = ?', [req.params.orderId]);
    if (!order) return res.status(404).send('Order not found');

    const price = 249;
    const qty = order.quantity || 1;
    const productTotal = (qty === 2) ? 399 : qty * price;
    const delivery = order.total - productTotal;

    const html = `
    <!DOCTYPE html>
    <html><head><title>Invoice ${order.order_id}</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #333; }
      h1 { color: #2d5a2d; border-bottom: 3px solid #e5d6c4; padding-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #eee; }
      th { background: #2d5a2d; color: #fff; }
      .total-row { font-weight: bold; font-size: 1.1rem; background: #f5f0e8; }
      .footer { margin-top: 40px; font-size: 0.85rem; color: #888; text-align: center; }
      @media print { body { margin: 0; } }
    </style></head><body>
    <h1>🌿 Ayufresh — Invoice</h1>
    <p><strong>Order ID:</strong> ${order.order_id}</p>
    <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString('en-IN')}</p>
    <p><strong>Customer:</strong> ${order.name}</p>
    <p><strong>Phone:</strong> ${order.phone}</p>
    <p><strong>Email:</strong> ${order.email}</p>
    <p><strong>Address:</strong> ${order.address}, ${order.city}, ${order.state} - ${order.pin}</p>
    <table>
      <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead>
      <tbody>
        <tr><td>Ayufresh Botanical Oral Care (100ml)</td><td>${qty}</td><td>₹${price}</td><td>₹${productTotal}</td></tr>
        <tr><td>Delivery Charges</td><td>—</td><td>—</td><td>₹${delivery}</td></tr>
        <tr class="total-row"><td colspan="3">Total</td><td>₹${order.total}</td></tr>
      </tbody>
    </table>
    <p><strong>Payment:</strong> ${order.payment.toUpperCase()} (${order.payment_status || 'pending'})</p>
    <p><strong>Status:</strong> ${order.status}</p>
    <div class="footer">
      <p>Ayufresh Botanical Oral Care · Pune, Maharashtra, India</p>
      <p>ayufresh6@gmail.com · +91 98819 94473</p>
    </div>
    </body></html>`;

    res.send(html);
  } catch (err) {
    console.error('Invoice error:', err);
    res.status(500).send('Failed to generate invoice');
  }
});

// ── Start ──
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
});