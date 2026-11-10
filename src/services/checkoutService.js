const crypto = require('crypto');
const db = require('../config/db');
const cart = require('./cartService');
const users = require('./users');
const { calculateTotals } = require('./pricing');
const { cleanText, isUuid } = require('./validation');
const { sendOrderConfirmation } = require('./mailer');

function normalizeCouponCode(code) {
  if (!code) return '';
  const value = String(code).trim().toUpperCase();
  if (!/^[A-Z0-9]{5}$/.test(value)) throw Object.assign(new Error('Mã giảm giá phải gồm đúng 5 ký tự chữ-số.'), { status: 400 });
  return value;
}

async function readItems(client, cartId, lock = false) {
  const lockClause = lock ? 'FOR UPDATE OF ci,v' : '';
  const { rows } = await client.query(
    `SELECT ci.id AS cart_item_id,ci.quantity,v.id AS variant_id,v.sku,v.name AS variant_name,
       v.price_vnd,v.stock_quantity,p.id AS product_id,p.name AS product_name
     FROM cart_items ci JOIN variants v ON v.id=ci.variant_id JOIN products p ON p.id=v.product_id
     WHERE ci.cart_id=$1 AND v.is_active=TRUE AND p.status='active' ORDER BY ci.created_at ${lockClause}`,
    [cartId]
  );
  if (!rows.length) throw Object.assign(new Error('Giỏ hàng đang trống.'), { status: 400 });
  for (const item of rows) {
    if (item.quantity > item.stock_quantity) {
      throw Object.assign(new Error(`${item.product_name} chỉ còn ${item.stock_quantity} sản phẩm.`), { status: 409 });
    }
    item.unit_price_vnd = Number(item.price_vnd);
    item.line_total_vnd = item.unit_price_vnd * item.quantity;
  }
  return rows;
}

async function getDiscount(client, code, lock = false) {
  if (!code) return null;
  const normalized = normalizeCouponCode(code);
  const result = await client.query(
    `SELECT id,code,discount_type,value,max_uses,used_count,is_active,created_at
     FROM discounts WHERE code=$1 ${lock ? 'FOR UPDATE' : ''}`, [normalized]
  );
  if (!result.rowCount || !result.rows[0].is_active) throw Object.assign(new Error('Mã giảm giá không tồn tại hoặc đã bị tắt.'), { status: 400 });
  const discount = result.rows[0];
  if (discount.used_count >= discount.max_uses) throw Object.assign(new Error('Mã giảm giá đã hết lượt sử dụng.'), { status: 409 });
  return discount;
}

function discountAmount(discount, subtotal) {
  if (!discount) return 0;
  const value = Number(discount.value);
  return Math.min(subtotal, discount.discount_type === 'percent' ? Math.floor(subtotal * value / 100) : value);
}

async function quote(req, res, input = {}) {
  if (req.user?.role && req.user.role !== 'customer') throw Object.assign(new Error('Chỉ customer mới có thể checkout.'), { status: 403 });
  const cartId = await cart.resolveCart(req, res);
  const client = await db.connect();
  try {
    const items = await readItems(client, cartId);
    const subtotal = items.reduce((sum, item) => sum + item.line_total_vnd, 0);
    const discount = await getDiscount(client, normalizeCouponCode(input.discountCode || ''), false);
    const discountVnd = discountAmount(discount, subtotal);
    const pointsRequested = Number(input.pointsToRedeem || 0);
    if (!Number.isSafeInteger(pointsRequested) || pointsRequested < 0) {
      throw Object.assign(new Error('Số điểm sử dụng phải là số nguyên không âm.'), { status: 400 });
    }
    let availablePoints = 0;
    if (req.user) {
      const account = await client.query('SELECT loyalty_balance FROM users WHERE id=$1 AND is_banned=FALSE', [req.user.id]);
      if (!account.rowCount) throw Object.assign(new Error('Tài khoản không thể checkout.'), { status: 403 });
      availablePoints = account.rows[0].loyalty_balance;
    } else if (pointsRequested > 0) {
      throw Object.assign(new Error('Đăng nhập để sử dụng điểm thưởng.'), { status: 401 });
    }
    if (pointsRequested > availablePoints) throw Object.assign(new Error(`Bạn hiện có ${availablePoints} điểm.`), { status: 400 });
    const totals = calculateTotals(subtotal, discountVnd, pointsRequested);
    const pointsRedeemed = Math.floor(totals.loyaltyRedeemedVnd / 1000);
    return {
      items: items.map((item) => ({ productName: item.product_name, variantName: item.variant_name, quantity: item.quantity, unitPriceVnd: item.unit_price_vnd, lineTotalVnd: item.line_total_vnd })),
      ...totals,
      pointsAvailable: availablePoints,
      pointsRedeemed,
      coupon: discount ? { code: discount.code.trim(), type: discount.discount_type, value: Number(discount.value), discountVnd, usesRemaining: Number(discount.max_uses - discount.used_count) } : null,
      taxRate: 0.1,
      shippingPolicy: '30.000đ; miễn phí từ 1.000.000đ'
    };
  } finally { client.release(); }
}

function addressSnapshot(input, fullName) {
  const details = users.validateAddress({
    recipientName: input.recipientName || fullName,
    phone: input.phone,
    line1: input.line1,
    line2: input.line2,
    ward: input.ward,
    district: input.district,
    province: input.province,
    postalCode: input.postalCode
  });
  return {
    recipientName: details.recipientName, phone: details.phone, line1: details.line1,
    line2: details.line2, ward: details.ward, district: details.district,
    province: details.province, postalCode: details.postalCode
  };
}

async function resolveShippingAddress(client, req, input, fullName) {
  if (req.user && input.addressId) {
    if (!isUuid(input.addressId)) throw Object.assign(new Error('Địa chỉ không hợp lệ.'), { status: 400 });
    const result = await client.query(
      `SELECT recipient_name,phone,line1,line2,ward,district,province,postal_code
       FROM addresses WHERE id=$1 AND user_id=$2 FOR UPDATE`, [input.addressId,req.user.id]
    );
    if (!result.rowCount) throw Object.assign(new Error('Không tìm thấy địa chỉ giao hàng.'), { status: 404 });
    const row = result.rows[0];
    return { recipientName: row.recipient_name, phone: row.phone, line1: row.line1, line2: row.line2, ward: row.ward, district: row.district, province: row.province, postalCode: row.postal_code };
  }
  return addressSnapshot(input.address || input, fullName);
}

async function placeOrder(req, res, input = {}) {
  if (req.user && req.user.role !== 'customer') throw Object.assign(new Error('Chỉ customer mới có thể checkout.'), { status: 403 });
  const cartId = await cart.resolveCart(req, res);
  const client = await db.connect();
  let order;
  let pointsEarned = 0;
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM carts WHERE id=$1 FOR UPDATE', [cartId]);
    const items = await readItems(client, cartId, true);
    const subtotal = items.reduce((sum, item) => sum + item.line_total_vnd, 0);
    const discount = await getDiscount(client, normalizeCouponCode(input.discountCode || ''), true);
    const discountVnd = discountAmount(discount, subtotal);
    const pointsRequested = Number(input.pointsToRedeem || 0);
    if (!Number.isSafeInteger(pointsRequested) || pointsRequested < 0) {
      throw Object.assign(new Error('Số điểm sử dụng phải là số nguyên không âm.'), { status: 400 });
    }

    let email;
    let fullName;
    let customer;
    let availablePoints = 0;
    if (req.user) {
      const account = await client.query('SELECT id,email,full_name,loyalty_balance,is_banned FROM users WHERE id=$1 FOR UPDATE', [req.user.id]);
      if (!account.rowCount || account.rows[0].is_banned) throw Object.assign(new Error('Tài khoản không thể checkout.'), { status: 403 });
      customer = account.rows[0]; email = customer.email; fullName = customer.full_name; availablePoints = customer.loyalty_balance;
    } else {
      email = input.email;
      fullName = input.fullName;
    }
    if (pointsRequested > availablePoints) throw Object.assign(new Error(`Bạn hiện có ${availablePoints} điểm.`), { status: 400 });
    const shippingAddress = await resolveShippingAddress(client, req, input, fullName || '');
    if (!req.user) {
      email = String(email || '').trim().toLowerCase();
      fullName = cleanText(fullName, 100);
      // Lưu tài khoản guest, địa chỉ và đơn cùng một transaction.
      customer = await users.ensureGuestCustomer(client, {
        email, fullName,
        address: [shippingAddress.line1,shippingAddress.line2,shippingAddress.ward,shippingAddress.district,shippingAddress.province,shippingAddress.postalCode].filter(Boolean).join(', '),
        addressDetails: shippingAddress
      });
    }
    const totals = calculateTotals(subtotal, discountVnd, pointsRequested);
    pointsEarned = totals.earnedPoints;
    const pointsRedeemed = Math.floor(totals.loyaltyRedeemedVnd / 1000);
    const orderNumber = `TH-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const inserted = await client.query(
      `INSERT INTO orders(order_number,user_id,email,recipient_name,shipping_address_snapshot,subtotal_vnd,
       discount_vnd,loyalty_redeemed_vnd,tax_vnd,shipping_fee_vnd,total_vnd,status,discount_id)
       VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,'pending',$12)
       RETURNING id,order_number,user_id,email,recipient_name,shipping_address_snapshot,subtotal_vnd,
       discount_vnd,loyalty_redeemed_vnd,tax_vnd,shipping_fee_vnd,total_vnd,status,created_at`,
      [orderNumber,customer.id,email,shippingAddress.recipientName,JSON.stringify(shippingAddress),subtotal,discountVnd,totals.loyaltyRedeemedVnd,totals.taxVnd,totals.shippingFeeVnd,totals.totalVnd,discount?.id || null]
    );
    order = inserted.rows[0];
    for (const item of items) {
      const stock = await client.query(
        'UPDATE variants SET stock_quantity=stock_quantity-$2,updated_at=NOW() WHERE id=$1 AND stock_quantity >= $2 RETURNING id',
        [item.variant_id,item.quantity]
      );
      if (!stock.rowCount) throw Object.assign(new Error(`${item.product_name} vừa hết hàng. Hãy cập nhật giỏ hàng.`), { status: 409 });
      await client.query(
        `INSERT INTO order_items(order_id,variant_id,sku_snapshot,product_name_snapshot,variant_name_snapshot,unit_price_vnd,quantity,line_total_vnd)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
        [order.id,item.variant_id,item.sku,item.product_name,item.variant_name,item.unit_price_vnd,item.quantity,item.line_total_vnd]
      );
    }
    await client.query(
      `INSERT INTO order_status_history(order_id,status,note) VALUES($1,'pending','Đơn hàng đã được tạo.')`, [order.id]
    );
    if (discount) {
      const updated = await client.query(
        'UPDATE discounts SET used_count=used_count+1 WHERE id=$1 AND used_count < max_uses RETURNING id', [discount.id]
      );
      if (!updated.rowCount) throw Object.assign(new Error('Mã giảm giá vừa hết lượt sử dụng.'), { status: 409 });
      await client.query(
        'INSERT INTO discount_redemptions(discount_id,order_id,user_id,discount_vnd) VALUES($1,$2,$3,$4)',
        [discount.id,order.id,customer.id,discountVnd]
      );
    }
    if (pointsRedeemed > 0) {
      await client.query('UPDATE users SET loyalty_balance=loyalty_balance-$2,updated_at=NOW() WHERE id=$1', [customer.id,pointsRedeemed]);
      await client.query(
        `INSERT INTO loyalty_points(user_id,order_id,type,points,amount_vnd)
         VALUES($1,$2,'redeemed',$3,$4)`, [customer.id,order.id,-pointsRedeemed,-totals.loyaltyRedeemedVnd]
      );
    }
    if (totals.earnedPoints > 0) {
      await client.query('UPDATE users SET loyalty_balance=loyalty_balance+$2,updated_at=NOW() WHERE id=$1', [customer.id,totals.earnedPoints]);
      await client.query(
        `INSERT INTO loyalty_points(user_id,order_id,type,points,amount_vnd)
         VALUES($1,$2,'earned',$3,$4)`, [customer.id,order.id,totals.earnedPoints,totals.earnedPoints*1000]
      );
    }
    await client.query('DELETE FROM cart_items WHERE cart_id=$1', [cartId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }

  const { rows: orderItems } = await db.query(
    'SELECT product_name_snapshot AS product_name,variant_name_snapshot AS variant_name,quantity,line_total_vnd FROM order_items WHERE order_id=$1 ORDER BY id', [order.id]
  );
  let emailSent = false;
  try { emailSent = await sendOrderConfirmation({ ...order, items: orderItems }); }
  catch (error) { console.error(`Không gửi được email xác nhận đơn ${order.order_number}:`, error.message); }
  return { ...order, emailSent, pointsEarned };
}

module.exports = { normalizeCouponCode, placeOrder, quote };
