const crypto = require('crypto');
const db = require('../config/db');
const { calculateTotals } = require('./pricing');

const CART_COOKIE = 'techhub.cart';
const CART_COOKIE_OPTIONS = { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', path: '/', maxAge: 30 * 24 * 60 * 60 * 1000 };
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

async function resolveCart(req, res) {
  let guestToken = req.cookies?.[CART_COOKIE] || '';
  if (!guestToken && !req.user) guestToken = crypto.randomBytes(32).toString('base64url');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    let cart;
    if (req.user) {
      let result = await client.query('SELECT id FROM carts WHERE user_id=$1 FOR UPDATE', [req.user.id]);
      if (!result.rowCount) {
        result = await client.query(
          `INSERT INTO carts(user_id) VALUES($1) ON CONFLICT(user_id) WHERE user_id IS NOT NULL DO NOTHING RETURNING id`, [req.user.id]
        );
        if (!result.rowCount) result = await client.query('SELECT id FROM carts WHERE user_id=$1 FOR UPDATE', [req.user.id]);
      }
      cart = result.rows[0];
      if (guestToken) {
        const guest = await client.query('SELECT id FROM carts WHERE guest_token_hash=$1 FOR UPDATE', [hashToken(guestToken)]);
        if (guest.rowCount && guest.rows[0].id !== cart.id) {
          const items = await client.query('SELECT variant_id,quantity FROM cart_items WHERE cart_id=$1', [guest.rows[0].id]);
          for (const item of items.rows) {
            const variant = await client.query('SELECT stock_quantity FROM variants WHERE id=$1 AND is_active=TRUE', [item.variant_id]);
            if (!variant.rowCount || variant.rows[0].stock_quantity < 1) continue;
            const existing = await client.query('SELECT id,quantity FROM cart_items WHERE cart_id=$1 AND variant_id=$2 FOR UPDATE', [cart.id,item.variant_id]);
            const quantity = Math.min(variant.rows[0].stock_quantity, item.quantity + (existing.rows[0]?.quantity || 0));
            if (existing.rowCount) await client.query('UPDATE cart_items SET quantity=$2,updated_at=NOW() WHERE id=$1', [existing.rows[0].id,quantity]);
            else await client.query('INSERT INTO cart_items(cart_id,variant_id,quantity) VALUES($1,$2,$3)', [cart.id,item.variant_id,quantity]);
          }
          await client.query('DELETE FROM carts WHERE id=$1', [guest.rows[0].id]);
        }
      }
    } else {
      const tokenHash = hashToken(guestToken);
      let result = await client.query('SELECT id FROM carts WHERE guest_token_hash=$1 FOR UPDATE', [tokenHash]);
      if (!result.rowCount) {
        result = await client.query(
          'INSERT INTO carts(guest_token_hash) VALUES($1) ON CONFLICT(guest_token_hash) DO UPDATE SET guest_token_hash=EXCLUDED.guest_token_hash RETURNING id', [tokenHash]
        );
      }
      cart = result.rows[0];
    }
    await client.query('COMMIT');
    if (!req.user && !req.cookies?.[CART_COOKIE]) res.cookie(CART_COOKIE, guestToken, CART_COOKIE_OPTIONS);
    if (req.user && req.cookies?.[CART_COOKIE]) res.clearCookie(CART_COOKIE, { path: '/', sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true' });
    return cart.id;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function getCart(req, res) {
  const cartId = await resolveCart(req, res);
  const { rows } = await db.query(
    `SELECT ci.id AS cart_item_id,ci.quantity,v.id AS variant_id,v.sku,v.name AS variant_name,
       v.price_vnd,v.stock_quantity,p.id AS product_id,p.slug,p.name AS product_name,
       (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY position LIMIT 1) AS image_url,
       (v.price_vnd*ci.quantity)::bigint AS line_total_vnd
     FROM cart_items ci JOIN variants v ON v.id=ci.variant_id
     JOIN products p ON p.id=v.product_id WHERE ci.cart_id=$1 AND p.status='active'
     ORDER BY ci.created_at`, [cartId]
  );
  const subtotalVnd = rows.reduce((total, item) => total + Number(item.line_total_vnd), 0);
  return { items: rows, ...calculateTotals(subtotalVnd), cartId };
}

async function addItem(req, res, variantId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw Object.assign(new Error('Số lượng phải từ 1 đến 99.'), { status: 400 });
  }
  const cartId = await resolveCart(req, res);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const variant = await client.query(
      `SELECT v.id,v.stock_quantity FROM variants v JOIN products p ON p.id=v.product_id
       WHERE v.id=$1 AND v.is_active=TRUE AND p.status='active' FOR UPDATE OF v`, [variantId]
    );
    if (!variant.rowCount) throw Object.assign(new Error('Biến thể không tồn tại hoặc đã ngừng bán.'), { status: 404 });
    const existing = await client.query('SELECT id,quantity FROM cart_items WHERE cart_id=$1 AND variant_id=$2 FOR UPDATE', [cartId,variantId]);
    const nextQuantity = quantity + (existing.rows[0]?.quantity || 0);
    if (nextQuantity > variant.rows[0].stock_quantity) {
      throw Object.assign(new Error(`Chỉ còn ${variant.rows[0].stock_quantity} sản phẩm trong kho.`), { status: 409 });
    }
    if (existing.rowCount) await client.query('UPDATE cart_items SET quantity=$2,updated_at=NOW() WHERE id=$1', [existing.rows[0].id,nextQuantity]);
    else await client.query('INSERT INTO cart_items(cart_id,variant_id,quantity) VALUES($1,$2,$3)', [cartId,variantId,quantity]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  return getCart(req, res);
}

async function updateItem(req, res, itemId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) {
    throw Object.assign(new Error('Số lượng phải từ 0 đến 99.'), { status: 400 });
  }
  const cartId = await resolveCart(req, res);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const item = await client.query(
      `SELECT ci.id,ci.variant_id,v.stock_quantity FROM cart_items ci
       JOIN variants v ON v.id=ci.variant_id WHERE ci.id=$1 AND ci.cart_id=$2 FOR UPDATE OF ci,v`, [itemId,cartId]
    );
    if (!item.rowCount) throw Object.assign(new Error('Không tìm thấy mặt hàng trong giỏ.'), { status: 404 });
    if (quantity > item.rows[0].stock_quantity) throw Object.assign(new Error(`Chỉ còn ${item.rows[0].stock_quantity} sản phẩm trong kho.`), { status: 409 });
    if (quantity === 0) await client.query('DELETE FROM cart_items WHERE id=$1', [itemId]);
    else await client.query('UPDATE cart_items SET quantity=$2,updated_at=NOW() WHERE id=$1', [itemId,quantity]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  return getCart(req, res);
}

async function removeItem(req, res, itemId) {
  const cartId = await resolveCart(req, res);
  await db.query('DELETE FROM cart_items WHERE id=$1 AND cart_id=$2', [itemId,cartId]);
  return getCart(req, res);
}

async function clearCart(req, res) {
  const cartId = await resolveCart(req, res);
  await db.query('DELETE FROM cart_items WHERE cart_id=$1', [cartId]);
  return getCart(req, res);
}

module.exports = { CART_COOKIE, addItem, clearCart, getCart, removeItem, resolveCart, updateItem };
