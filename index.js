// ✅ index.js - Updated Full Inventory API (All Complete)
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');
dotenv.config();

const app = express();
const md = new MarkdownIt();

app.set('json spaces', 2);

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err));

const productSchema = new mongoose.Schema({
  _id: Number,
  serial: { type: Number, unique: true },
  name: { type: String, required: true },
  nameLower: { type: String, required: true, unique: true }
});
const Product = mongoose.model('Product', productSchema);

const purchaseSchema = new mongoose.Schema({
  nameLower: String,
  qty: Number,
  price: Number,
  date: { type: String, default: () => getFormattedDate() }
});
const Purchase = mongoose.model('Purchase', purchaseSchema);

const salesSchema = new mongoose.Schema({
  nameLower: String,
  qty: Number,
  price: Number,
  date: { type: String, default: () => getFormattedDate() }
});
const Sales = mongoose.model('Sales', salesSchema);

function getFormattedDate() {
  const now = new Date();
  now.setHours(now.getHours() + 6);
  const day = now.getDate().toString().padStart(2, '0');
  const month = now.toLocaleString('en-US', { month: 'long' });
  const year = now.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatInputDate(input) {
  const [d, m, y] = input.split('-');
  const day = d.padStart(2, '0');
  const year = `20${y}`;
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = months[parseInt(m) - 1] || 'Invalid';
  return `${day} ${month} ${year}`;
}

const secret = fs.readFileSync('CRX.txt', 'utf-8').trim();

app.get('/', (req, res) => {
  const readmePath = path.join(__dirname, 'README.md');
  fs.readFile(readmePath, 'utf-8', (err, data) => {
    if (err) return res.status(500).send('README.md not found');
    const html = md.render(data);
    res.setHeader('Content-Type', 'text/html');
    res.send(`<html><head><meta charset="utf-8"><title>📘 README</title><style>body { font-family: sans-serif; padding: 2rem; background: #f9f9f9; color: #333; max-width: 800px; margin: auto; line-height: 1.7; } h1, h2 { color: #1e88e5; } pre { background: #eee; padding: 1rem; overflow-x: auto; } code { background: #eee; padding: 0.2rem 0.4rem; border-radius: 4px; }</style></head><body>${html}</body></html>`);
  });
});

app.get('/api/add-product', async (req, res) => {
  const name = req.query.name?.trim();
  if (!name) return res.status(400).json({ error: '❌ Missing product name' });
  const nameLower = name.toLowerCase();
  try {
    const existing = await Product.findOne({ nameLower });
    if (existing) return res.json({ message: '✅ Product already exists', product: existing });
    const last = await Product.findOne().sort({ _id: -1 });
    const newId = last ? last._id + 1 : 1010;
    const newSerial = last ? last.serial + 1 : 1;
    const product = new Product({ _id: newId, serial: newSerial, name, nameLower });
    await product.save();
    res.json({ message: '✅ New product added', product });
  } catch (err) {
    if (err.code === 11000) {
      const existing = await Product.findOne({ nameLower });
      return res.json({ message: '⚠️ Product already existed', product: existing });
    }
    res.status(500).json({ error: '❌ Server error', details: err.message });
  }
});

app.get('/api/purchase', async (req, res) => {
  const { name, qty, price } = req.query;
  if (!name || !qty || !price) return res.status(400).json({ error: 'Missing parameters' });
  const nameLower = name.toLowerCase();
  const purchase = await Purchase.create({ nameLower, qty: +qty, price: +price });
  res.json({ message: '✅ Purchase saved', purchase });
});

app.get('/api/sales', async (req, res) => {
  const { name, qty, price } = req.query;
  const nameLower = name?.toLowerCase();
  if (!nameLower || !qty || !price) return res.status(400).json({ error: '❌ name, qty, and price required' });
  const product = await Product.findOne({ nameLower });
  if (!product) return res.status(404).json({ error: '❌ Product not found' });
  const purchased = await Purchase.aggregate([{ $match: { nameLower } }, { $group: { _id: null, total: { $sum: '$qty' } } }]);
  const sold = await Sales.aggregate([{ $match: { nameLower } }, { $group: { _id: null, total: { $sum: '$qty' } } }]);
  const stock = (purchased[0]?.total || 0) - (sold[0]?.total || 0);
  if (stock < parseInt(qty)) return res.status(400).json({ error: `❌ Not enough stock. Available: ${stock}` });
  await Sales.create({ nameLower, qty: parseInt(qty), price: parseFloat(price), date: getFormattedDate() });
  res.json({ message: '✅ Sale recorded', product: { name: product.name, id: product._id, serial: product.serial, stock: stock - parseInt(qty) } });
});

app.get('/api/stock', async (req, res) => {
  const filterName = req.query.name?.toLowerCase();
  const products = filterName ? await Product.find({ nameLower: filterName }) : await Product.find();
  const results = [];
  for (const p of products) {
    const purchased = await Purchase.aggregate([{ $match: { nameLower: p.nameLower } }, { $group: { _id: null, total: { $sum: '$qty' } } }]);
    const sold = await Sales.aggregate([{ $match: { nameLower: p.nameLower } }, { $group: { _id: null, total: { $sum: '$qty' } } }]);
    results.push({ name: p.name, id: p._id, serial: p.serial, purchased: purchased[0]?.total || 0, sold: sold[0]?.total || 0, stock: (purchased[0]?.total || 0) - (sold[0]?.total || 0) });
  }
  res.json(results);
});

app.get('/api/product-summary', async (req, res) => {
  const products = await Product.find();
  const summary = [];
  for (const p of products) {
    const purchased = await Purchase.aggregate([{ $match: { nameLower: p.nameLower } }, { $group: { _id: null, total: { $sum: '$qty' } } }]);
    const sold = await Sales.aggregate([{ $match: { nameLower: p.nameLower } }, { $group: { _id: null, total: { $sum: '$qty' } } }]);
    summary.push({ name: p.name, id: p._id, serial: p.serial, purchased: purchased[0]?.total || 0, sold: sold[0]?.total || 0, stock: (purchased[0]?.total || 0) - (sold[0]?.total || 0) });
  }
  res.json(summary);
});

app.get('/api/delete-all', async (req, res) => {
  if (req.query.secret !== secret) return res.status(403).json({ error: 'Unauthorized' });
  await Product.deleteMany(); await Purchase.deleteMany(); await Sales.deleteMany();
  res.json({ message: '🔥 All data deleted' });
});

app.get('/api/delete-product', async (req, res) => {
  const name = req.query.name?.trim().toLowerCase();
  const secretInput = req.query.secret?.trim();
  if (!name || !secretInput) return res.status(400).json({ error: '❌ Missing product name or secret' });
  const fileSecret = fs.readFileSync(path.join(__dirname, 'CRX.txt'), 'utf-8').trim();
  if (secretInput !== fileSecret) return res.status(403).json({ error: '❌ Invalid secret' });
  const deleted = await Product.findOneAndDelete({ nameLower: name });
  if (!deleted) return res.status(404).json({ message: '❌ Product not found' });
  const deletedPurchases = await Purchase.deleteMany({ nameLower: name });
  const deletedSales = await Sales.deleteMany({ nameLower: name });
  const remaining = await Product.find().sort({ _id: 1 });
  for (let i = 0; i < remaining.length; i++) { remaining[i].serial = i + 1; await remaining[i].save(); }
  res.json({ message: `✅ Product "${deleted.name}" and related data deleted`, deletedId: deleted._id, purchasesDeleted: deletedPurchases.deletedCount, salesDeleted: deletedSales.deletedCount, totalRemaining: remaining.length });
});

app.get('/api/re', async (req, res) => {
  const secretInput = req.query.secret?.trim();
  if (!secretInput) return res.status(400).json({ error: '❌ Secret required' });
  const fileSecret = fs.readFileSync(path.join(__dirname, 'CRX.txt'), 'utf-8').trim();
  if (secretInput !== fileSecret) return res.status(403).json({ error: '❌ Invalid secret' });
  const products = await Product.find().sort({ _id: 1 });
  for (let i = 0; i < products.length; i++) { products[i].serial = i + 1; await products[i].save(); }
  res.json({ message: '✅ Serial numbers updated successfully', totalUpdated: products.length });
});

app.get('/api/search', async (req, res) => {
  const { name, id, serial } = req.query;
  const filter = {};
  if (name) filter.nameLower = name.toLowerCase();
  if (id) filter._id = parseInt(id);
  if (serial) filter.serial = parseInt(serial);
  const products = await Product.find(filter).select('-__v');
  if (!products.length) return res.status(404).json({ message: '❌ No product found with given query' });
  const results = [];
  for (const p of products) {
    const purchased = await Purchase.aggregate([{ $match: { nameLower: p.nameLower } }, { $group: { _id: null, total: { $sum: '$qty' } } }]);
    const sold = await Sales.aggregate([{ $match: { nameLower: p.nameLower } }, { $group: { _id: null, total: { $sum: '$qty' } } }]);
    results.push({ id: p._id, serial: p.serial, name: p.name, stock: (purchased[0]?.total || 0) - (sold[0]?.total || 0) });
  }
  res.json({ message: `🔍 Found ${results.length} product(s)`, results });
});

app.get('/api/report', async (req, res) => {
  let { date, from, to } = req.query;
  if (date) date = formatInputDate(date);
  if (from && to) { from = formatInputDate(from); to = formatInputDate(to); }
  let purchases = [], sales = [];
  if (date) {
    purchases = await Purchase.find({ date });
    sales = await Sales.find({ date });
  } else if (from && to) {
    purchases = await Purchase.find({ date: { $gte: from, $lte: to } });
    sales = await Sales.find({ date: { $gte: from, $lte: to } });
  } else {
    return res.status(400).json({ error: '❌ Provide ?date= or ?from= & to=' });
  }
  const totalPurchasedQty = purchases.reduce((sum, p) => sum + p.qty, 0);
  const totalPurchasedAmount = purchases.reduce((sum, p) => sum + p.qty * p.price, 0);
  const totalSoldQty = sales.reduce((sum, s) => sum + s.qty, 0);
  const totalSalesAmount = sales.reduce((sum, s) => sum + s.qty * s.price, 0);
  const profit = totalSalesAmount - totalPurchasedAmount;
  res.json({ type: date || `${from} → ${to}`, purchases, sales, summary: { totalPurchasedQty, totalPurchasedAmount, totalSoldQty, totalSalesAmount, profit } });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
