// ============================================
// AYUFRESH — Express app (Supabase/Postgres)
// ============================================
require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();

// ══════ Postgres Pool (Supabase) ══════
if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL is not set. DB calls will fail.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

async function queryAll(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}
async function queryOne(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows[0] || null;
}
async function runSql(sql, params = []) {
  await pool.query(sql, params);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ══════ PAGE ROUTES ══════
const viewsDir = path.join(__dirname, 'views');
app.get('/', (req, res) => res.sendFile(path.join(viewsDir, 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(viewsDir, 'about.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(viewsDir, 'contact.html')));
app.get('/order', (req, res) => res.sendFile(path.join(viewsDir, 'order.html')));
app.get('/order-success', (req, res) => res.sendFile(path.join(viewsDir, 'order-success.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(viewsDir, 'admin.html')));
app.get('/track', (req, res) => res.sendFile(path.join(viewsDir, 'track.html')));
app.get('/privacy-policy', (req, res) => res.sendFile(path.join(viewsDir, 'privacy-policy.html')));
app.get('/terms-and-conditions', (req, res) => res.sendFile(path.join(viewsDir, 'terms-and-conditions.html')));
app.get('/shipping-policy', (req, res) => res.sendFile(path.join(viewsDir, 'shipping-policy.html')));
app.get('/refund-and-cancellation', (req, res) => res.sendFile(path.join(viewsDir, 'refund-and-cancellation.html')));

// Static
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(viewsDir));

// ══════ API — Orders ══════
app.post('/api/orders', async (req, res) => {
  try {
    const { name, phone, email, address, city, state, pin, quantity, payment } = req.body;
    const order_id = 'AYU-' + Date.now();
    const qty = parseInt(quantity) || 1;
    const price = 249;
    const delivery = (state === 'Maharashtra') ? 50 : 70;
    let productTotal = (qty === 2) ? 399 : qty * price;
    const total = productTotal + delivery;

    await runSql(
      `INSERT INTO orders (order_id,name,phone,email,address,city,state,pin,quantity,total,payment,payment_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [order_id, name, phone, email, address, city, state || 'Maharashtra', pin, qty, total, payment,
       payment === 'cod' ? 'pending' : 'paid']
    );

    res.json({ success: true, order_id, total, delivery });
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// ══════ API — Razorpay placeholder ══════
app.post('/api/create-payment', async (req, res) => {
  res.status(503).json({ error: 'Razorpay not configured yet. Use COD.' });
});

// ══════ API — Order Tracking ══════
app.get('/api/track/:id', async (req, res) => {
  try {
    const order = await queryOne('SELECT * FROM orders WHERE order_id=$1', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('Track error:', err);
    res.status(500).json({ error: 'Failed to track order' });
  }
});

// ══════ API — Reviews ══════
app.post('/api/review', async (req, res) => {
  try {
    await runSql('INSERT INTO reviews (name, review, rating) VALUES ($1,$2,$3)',
      [req.body.name, req.body.review, req.body.rating]);
    res.json({ success: true });
  } catch (err) {
    console.error('Review error:', err);
    res.status(500).json({ error: 'Failed to save review' });
  }
});

app.get('/api/reviews', async (req, res) => {
  try {
    res.json(await queryAll('SELECT * FROM reviews ORDER BY created_at DESC'));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

// ══════ API — Contacts ══════
app.post('/api/contacts', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email and message are required' });
    }
    await runSql(
      'INSERT INTO contacts (name, email, phone, subject, message) VALUES ($1,$2,$3,$4,$5)',
      [name, email, phone || '', subject || '', message]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Contact error:', err);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// ══════ Admin ══════
app.post('/api/admin/login', (req, res) => {
  const adminPassword = process.env.ADMIN_PASSWORD || 'ayufresh2026';
  if (req.body.password === adminPassword) {
    res.json({ success: true, token: 'ayufresh-admin-' + Date.now() });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalOrders = (await queryOne('SELECT COUNT(*)::int AS c FROM orders'))?.c || 0;
    const totalRevenue = (await queryOne(`SELECT COALESCE(SUM(total),0)::float AS s FROM orders WHERE status != 'cancelled'`))?.s || 0;
    const pendingOrders = (await queryOne(`SELECT COUNT(*)::int AS c FROM orders WHERE status = 'pending'`))?.c || 0;
    const unreadContacts = (await queryOne('SELECT COUNT(*)::int AS c FROM contacts WHERE read = 0'))?.c || 0;
    res.json({ totalOrders, totalRevenue, pendingOrders, unreadContacts });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

app.get('/api/admin/orders', async (req, res) => {
  try {
    res.json(await queryAll('SELECT * FROM orders ORDER BY created_at DESC'));
  } catch (err) {
    console.error('Admin orders error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

app.patch('/api/admin/orders/:id', async (req, res) => {
  try {
    const { status, delivery_partner } = req.body;
    if (status) await runSql('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]);
    if (delivery_partner !== undefined) {
      await runSql('UPDATE orders SET delivery_partner = $1 WHERE id = $2', [delivery_partner, req.params.id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

app.delete('/api/admin/orders/:id', async (req, res) => {
  try {
    await runSql('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

app.get('/api/admin/contacts', async (req, res) => {
  try {
    res.json(await queryAll('SELECT * FROM contacts ORDER BY created_at DESC'));
  } catch (err) {
    console.error('Admin contacts error:', err);
    res.status(500).json({ error: 'Failed to load contacts' });
  }
});

app.patch('/api/admin/contacts/:id/read', async (req, res) => {
  try {
    await runSql('UPDATE contacts SET read = 1 WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// ══════ Invoice ══════
app.get('/api/invoice/:orderId', async (req, res) => {
  try {
    const order = await queryOne('SELECT * FROM orders WHERE order_id = $1', [req.params.orderId]);
    if (!order) return res.status(404).send('Order not found');

    const price = 249;
    const qty = order.quantity || 1;
    const productTotal = (qty === 2) ? 399 : qty * price;
    const delivery = Number(order.total) - productTotal;

    const html = `<!DOCTYPE html>
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

module.exports = app;
