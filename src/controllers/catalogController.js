const catalog = require('../services/catalogService');
const db = require('../config/db');
const { isUuid } = require('../services/validation');

async function products(req, res) {
  res.json(await catalog.listProducts(req.query));
}

async function newest(req, res) {
  res.json(await catalog.listProducts(req.query, 'new'));
}

async function bestSellers(req, res) {
  res.json(await catalog.listProducts(req.query, 'best'));
}

async function categories(_req, res) {
  res.json({ data: await catalog.getCategories() });
}

async function brands(_req, res) {
  res.json({ data: await catalog.getBrands() });
}

async function product(req, res) {
  const data = await catalog.getProduct(req.params.slug, req.user?.id);
  if (!data) return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
  res.json({ data });
}

async function reviews(req, res) {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
  const product = await db.query("SELECT id FROM products WHERE id=$1 AND status='active'", [req.params.id]);
  if (!product.rowCount) return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
  res.json(await catalog.getReviews(req.params.id, req.query));
}

module.exports = { bestSellers, brands, categories, newest, product, products, reviews };
