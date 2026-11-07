const express = require('express');
const helmet = require('helmet');

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'techhub-api' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'techhub-api' }));
app.get('/api/products', async (_req, res, next) => {
  try {
    const db = require('./config/db');
    const { rows } = await db.query(
      `SELECT p.id, p.name, p.slug, p.short_description, b.name AS brand,
        c.name AS category, MIN(v.price_vnd) AS price_vnd,
        COALESCE(SUM(v.stock_quantity), 0)::int AS stock_quantity
       FROM products p JOIN brands b ON b.id=p.brand_id
       JOIN categories c ON c.id=p.category_id LEFT JOIN variants v ON v.product_id=p.id
       WHERE p.status='active' GROUP BY p.id,b.name,c.name ORDER BY p.name LIMIT 100`
    );
    res.json({ data: rows, page: 1, totalPages: 1 });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error.message);
  res.status(500).json({ error: 'Đã có lỗi máy chủ.' });
});

module.exports = app;
