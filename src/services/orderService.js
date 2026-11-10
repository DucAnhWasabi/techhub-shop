const db = require('../config/db');
const { parseInteger } = require('./catalogService');

async function listOrders(userId, query) {
  const page = parseInteger(query.page, 1, { max: 100000 });
  const limit = parseInteger(query.limit, 10, { min: 1, max: 20 });
  const count = await db.query('SELECT COUNT(*)::int AS total FROM orders WHERE user_id=$1', [userId]);
  const total = count.rows[0].total;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, totalPages);
  const { rows } = await db.query(
    `SELECT id,order_number,status,total_vnd,created_at,
       (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id=o.id) AS item_count
     FROM orders o WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`,
    [userId,limit,(currentPage-1)*limit]
  );
  return { data: rows, page: currentPage, limit, total, totalPages };
}

async function getOrder(userId, orderId) {
  const orderResult = await db.query(
    `SELECT id,order_number,status,email,recipient_name,shipping_address_snapshot,subtotal_vnd,
      discount_vnd,loyalty_redeemed_vnd,tax_vnd,shipping_fee_vnd,total_vnd,created_at
     FROM orders WHERE id=$1 AND user_id=$2`, [orderId,userId]
  );
  if (!orderResult.rowCount) return null;
  const order = orderResult.rows[0];
  const [items, history] = await Promise.all([
    db.query(
      `SELECT sku_snapshot,product_name_snapshot,variant_name_snapshot,unit_price_vnd,quantity,line_total_vnd
       FROM order_items WHERE order_id=$1 ORDER BY id`, [orderId]
    ),
    db.query(
      `SELECT status,note,changed_by_user_id,created_at FROM order_status_history
       WHERE order_id=$1 ORDER BY created_at DESC,id DESC`, [orderId]
    )
  ]);
  return { ...order, items: items.rows, statusHistory: history.rows };
}

module.exports = { getOrder, listOrders };
