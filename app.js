// ============================================
// AYUFRESH — Express app (Supabase REST API)
// ============================================
require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// ══════ Supabase Client (HTTPS — no Postgres connection needed) ══════
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xrteltehjqpfznovhmqe.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhydGVsdGVoanFwZnpub3ZobXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDU5MTgsImV4cCI6MjA5MTgyMTkxOH0.dKBQdgRRiMPcSqP7F2CxGBhSO-4jXQHuGFHeR7ezws0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ══════ Root dir ══════
const fs = require('fs');
let baseDir = __dirname;
if (!fs.existsSync(path.join(baseDir, 'views')) && fs.existsSync(path.join(baseDir, '..', 'views'))) {
  baseDir = path.resolve(baseDir, '..');
}

// ══════ Static (before page routes) ══════
const viewsDir = path.join(baseDir, 'views');
app.use(express.static(path.join(baseDir, 'public')));
app.use(express.static(viewsDir));

// ══════ PAGE ROUTES ══════
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

// ══════ Health Check ══════
app.get('/api/health', async (req, res) => {
  const info = {
    supabase_url: SUPABASE_URL,
    supabase_key_set: !!SUPABASE_KEY
  };
  try {
    const { data, error } = await supabase.from('orders').select('id').limit(1);
    if (error) throw error;
    info.db_connected = true;
  } catch (err) {
    info.db_connected = false;
    info.db_error = err.message;
  }
  res.json(info);
});

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

    const { error } = await supabase.from('orders').insert({
      order_id, name, phone, email, address, city,
      state: state || 'Maharashtra', pin, quantity: qty,
      total, payment, payment_status: payment === 'cod' ? 'pending' : 'paid'
    });

    if (error) throw error;
    res.json({ success: true, order_id, total, delivery });
  } catch (err) {
    console.error('Order error:', err.message);
    res.status(500).json({ error: 'Failed to place order', detail: err.message });
  }
});

// ══════ API — Razorpay placeholder ══════
app.post('/api/create-payment', async (req, res) => {
  res.status(503).json({ error: 'Razorpay not configured yet. Use COD.' });
});

// ══════ API — Order Tracking ══════
app.get('/api/track/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('orders').select('*').eq('order_id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Order not found' });
    res.json(data);
  } catch (err) {
    console.error('Track error:', err);
    res.status(500).json({ error: 'Failed to track order' });
  }
});

// ══════ API — Reviews ══════
app.post('/api/review', async (req, res) => {
  try {
    const { error } = await supabase.from('reviews').insert({
      name: req.body.name, review: req.body.review, rating: req.body.rating
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Review error:', err);
    res.status(500).json({ error: 'Failed to save review' });
  }
});

app.get('/api/reviews', async (req, res) => {
  try {
    const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
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
    const { error } = await supabase.from('contacts').insert({
      name, email, phone: phone || '', subject: subject || '', message
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Contact error:', err.message);
    res.status(500).json({ error: 'Failed to save message', detail: err.message });
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
    const { count: totalOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    const { data: revData } = await supabase.from('orders').select('total').neq('status', 'cancelled');
    const totalRevenue = (revData || []).reduce((sum, o) => sum + Number(o.total), 0);
    const { count: pendingOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: unreadContacts } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('read', 0);
    res.json({ totalOrders: totalOrders || 0, totalRevenue, pendingOrders: pendingOrders || 0, unreadContacts: unreadContacts || 0 });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

app.get('/api/admin/orders', async (req, res) => {
  try {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Admin orders error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

app.patch('/api/admin/orders/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.status) updates.status = req.body.status;
    if (req.body.delivery_partner !== undefined) updates.delivery_partner = req.body.delivery_partner;
    const { error } = await supabase.from('orders').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

app.delete('/api/admin/orders/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('orders').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

app.get('/api/admin/contacts', async (req, res) => {
  try {
    const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Admin contacts error:', err);
    res.status(500).json({ error: 'Failed to load contacts' });
  }
});

app.patch('/api/admin/contacts/:id/read', async (req, res) => {
  try {
    const { error } = await supabase.from('contacts').update({ read: 1 }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// ══════ Invoice ══════
app.get('/api/invoice/:orderId', async (req, res) => {
  try {
    const { data: order, error } = await supabase.from('orders').select('*').eq('order_id', req.params.orderId).single();
    if (error || !order) return res.status(404).send('Order not found');

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
    <tr><td>Ayufresh Botanical Tooth & Gums Protector (100ml)</td><td>${qty}</td><td>₹${price}</td><td>₹${productTotal}</td></tr>
    <tr><td>Delivery Charges</td><td>—</td><td>—</td><td>₹${delivery}</td></tr>
    <tr class="total-row"><td colspan="3">Total</td><td>₹${order.total}</td></tr>
  </tbody>
</table>
<p><strong>Payment:</strong> ${order.payment.toUpperCase()} (${order.payment_status || 'pending'})</p>
<p><strong>Status:</strong> ${order.status}</p>
<div class="footer">
  <p>Ayufresh Botanical Tooth & Gums Protector · Pune, Maharashtra, India</p>
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
