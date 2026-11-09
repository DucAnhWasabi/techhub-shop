const db = require('../config/db');
const { cleanText, isUuid } = require('../services/validation');

async function comment(req, res) {
  const body = cleanText(req.body.body, 2000);
  const authorName = req.user?.full_name || cleanText(req.body.authorName, 80);
  if (req.user?.is_banned) return res.status(403).json({ error: 'Tài khoản đã bị khóa.' });
  if (authorName.length < 2) return res.status(400).json({ error: 'Vui lòng nhập tên hiển thị hợp lệ.' });
  if (body.length < 3) return res.status(400).json({ error: 'Bình luận cần có ít nhất 3 ký tự.' });
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });

  const product = await db.query("SELECT id FROM products WHERE id=$1 AND status='active'", [req.params.id]);
  if (!product.rowCount) return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
  const { rows } = await db.query(
    `INSERT INTO reviews(product_id,user_id,author_name,body) VALUES($1,$2,$3,$4)
     RETURNING id,author_name,body,created_at`, [req.params.id,req.user?.id || null,authorName,body]
  );
  req.app.locals.io?.to(`product:${req.params.id}`).emit('product:review:new', rows[0]);
  res.status(201).json({ data: rows[0] });
}

async function rate(req, res) {
  const stars = Number(req.body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ error: 'Số sao phải là số nguyên từ 1 đến 5.' });
  }
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
  if (req.user.role !== 'customer') return res.status(403).json({ error: 'Chỉ customer mới có thể đánh giá.' });
  const { rows } = await db.query(
    `INSERT INTO ratings(product_id,user_id,stars)
       SELECT p.id,$2,$3 FROM products p WHERE p.id=$1 AND p.status='active'
     ON CONFLICT(product_id,user_id) DO UPDATE SET stars=EXCLUDED.stars,updated_at=NOW()
     RETURNING id,product_id,user_id,stars,updated_at`, [req.params.id,req.user.id,stars]
  );
  if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
  const aggregate = await db.query(
    `SELECT ROUND(AVG(stars)::numeric,1) AS average_rating,COUNT(*)::int AS rating_count
     FROM ratings WHERE product_id=$1`, [req.params.id]
  );
  const event = { ...aggregate.rows[0], myRating: rows[0].stars };
  req.app.locals.io?.to(`product:${req.params.id}`).emit('product:rating:updated', event);
  res.json({ data: event });
}

module.exports = { comment, rate };
