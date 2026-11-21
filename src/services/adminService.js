const db = require('../config/db');
const { parseInteger } = require('./catalogService');
const { cleanText, isUuid, normalizeEmail, validEmail } = require('./validation');

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const slugify = (value) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const positive = (value, name, allowZero = false) => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < (allowZero ? 0 : 1)) fail(`${name} không hợp lệ.`);
  return n;
};

function paging(query, defaultLimit = 20, maxLimit = 100) {
  const page = parseInteger(query.page, 1, { max: 100000 });
  const limit = parseInteger(query.limit, defaultLimit, { min: 1, max: maxLimit });
  return { page, limit };
}

async function paged(sqlCount, sqlRows, values, query, defaultLimit = 20) {
  const { page, limit } = paging(query, defaultLimit);
  const count = await db.query(sqlCount, values);
  const total = Number(count.rows[0].total);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(page, totalPages);
  const { rows } = await db.query(sqlRows, [...values, limit, (current - 1) * limit]);
  return { data: rows, page: current, limit, total, totalPages };
}

async function dashboard() {
  const [stats, bestSellers] = await Promise.all([
    db.query(`SELECT (SELECT COUNT(*)::int FROM users WHERE role='customer') AS total_users,
      (SELECT COUNT(*)::int FROM users WHERE role='customer' AND created_at >= date_trunc('month',NOW())) AS new_users,
      (SELECT COUNT(*)::int FROM orders) AS total_orders,
      (SELECT COALESCE(SUM(total_vnd),0)::bigint FROM orders WHERE status<>'cancelled') AS revenue`),
    db.query(`SELECT oi.product_name_snapshot AS name,SUM(oi.quantity)::int AS quantity,
      SUM(oi.line_total_vnd)::bigint AS revenue FROM order_items oi JOIN orders o ON o.id=oi.order_id
      WHERE o.status<>'cancelled' GROUP BY oi.product_name_snapshot ORDER BY quantity DESC,revenue DESC LIMIT 5`)
  ]);
  return { ...stats.rows[0], bestSellers: bestSellers.rows };
}

function dateBounds(query) {
  const period = query.period || 'year';
  const year = parseInteger(query.year, new Date().getFullYear(), { min: 2000, max: 2200 });
  let start; let end; let bucket;
  if (period === 'year') { start = `${year}-01-01`; end = `${year + 1}-01-01`; bucket = 'month'; }
  else if (period === 'quarter') {
    const quarter = parseInteger(query.quarter, Math.floor(new Date().getMonth() / 3) + 1, { min: 1, max: 4 });
    const month = (quarter - 1) * 3;
    start = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    end = new Date(Date.UTC(year, month + 3, 1)).toISOString().slice(0, 10); bucket = 'month';
  } else if (period === 'month') {
    const month = parseInteger(query.month, new Date().getMonth() + 1, { min: 1, max: 12 });
    start = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
    end = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10); bucket = 'day';
  } else if (period === 'week') {
    const date = query.from ? new Date(query.from) : new Date();
    if (Number.isNaN(date.getTime())) fail('Ngày bắt đầu không hợp lệ.');
    const day = (date.getUTCDay() + 6) % 7;
    const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day));
    start = monday.toISOString().slice(0, 10); end = new Date(monday.getTime() + 7 * 86400000).toISOString().slice(0, 10); bucket = 'day';
  } else if (period === 'range') {
    start = query.from; end = query.to;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '') || !/^\d{4}-\d{2}-\d{2}$/.test(end || '') || start >= end ||
      !Number.isFinite(Date.parse(`${start}T00:00:00Z`)) || !Number.isFinite(Date.parse(`${end}T00:00:00Z`))) fail('Khoảng ngày không hợp lệ.');
    const days = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000;
    if (days > 366) fail('Khoảng ngày tối đa là 366 ngày.');
    bucket = days > 90 ? 'week' : 'day';
  } else fail('Kiểu kỳ báo cáo không hợp lệ.');
  return { period, start, end, bucket };
}

async function analytics(query) {
  const { period, start, end, bucket } = dateBounds(query);
  const duration = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000;
  const previousStart = new Date(Date.parse(`${start}T00:00:00Z`) - duration * 86400000).toISOString().slice(0, 10);
  const previousEnd = start;
  const seriesSql = `WITH order_profit AS (SELECT oi.order_id,
        (SUM(oi.line_total_vnd)-o.discount_vnd-o.loyalty_redeemed_vnd-SUM(oi.unit_cost_vnd*oi.quantity))::bigint AS profit
        FROM order_items oi JOIN orders o ON o.id=oi.order_id GROUP BY oi.order_id,o.discount_vnd,o.loyalty_redeemed_vnd)
      SELECT date_trunc($1,o.created_at)::date AS bucket,COUNT(*)::int AS orders,
        COALESCE(SUM(o.total_vnd),0)::bigint AS revenue,COALESCE(SUM(op.profit),0)::bigint AS profit
      FROM orders o LEFT JOIN order_profit op ON op.order_id=o.id
      WHERE o.status<>'cancelled' AND o.created_at >= $2::date AND o.created_at < $3::date
      GROUP BY 1 ORDER BY 1`;
  const [series, totals, previousSeries] = await Promise.all([
    db.query(seriesSql, [bucket, start, end]),
    db.query(`WITH order_profit AS (SELECT oi.order_id,
        (SUM(oi.line_total_vnd)-o.discount_vnd-o.loyalty_redeemed_vnd-SUM(oi.unit_cost_vnd*oi.quantity))::bigint AS profit
        FROM order_items oi JOIN orders o ON o.id=oi.order_id GROUP BY oi.order_id,o.discount_vnd,o.loyalty_redeemed_vnd)
      SELECT COUNT(*)::int AS orders,COALESCE(SUM(o.total_vnd),0)::bigint AS revenue,
        COALESCE(SUM(op.profit),0)::bigint AS profit
      FROM orders o LEFT JOIN order_profit op ON op.order_id=o.id
      WHERE o.status<>'cancelled' AND o.created_at >= $1::date AND o.created_at < $2::date`, [start,end]),
    db.query(seriesSql, [bucket, previousStart, previousEnd])
  ]);
  const previous = await db.query(`WITH order_profit AS (SELECT oi.order_id,
      (SUM(oi.line_total_vnd)-o.discount_vnd-o.loyalty_redeemed_vnd-SUM(oi.unit_cost_vnd*oi.quantity))::bigint AS profit
      FROM order_items oi JOIN orders o ON o.id=oi.order_id GROUP BY oi.order_id,o.discount_vnd,o.loyalty_redeemed_vnd)
    SELECT COUNT(*)::int AS orders,COALESCE(SUM(o.total_vnd),0)::bigint AS revenue,
      COALESCE(SUM(op.profit),0)::bigint AS profit
    FROM orders o LEFT JOIN order_profit op ON op.order_id=o.id
    WHERE o.status<>'cancelled' AND o.created_at >= $1::date AND o.created_at < $2::date`, [previousStart,previousEnd]);
  const dateLabel = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  return { period, start, end, current: totals.rows[0], previous: previous.rows[0],
    series: series.rows.map((row) => ({ ...row, bucket: dateLabel(row.bucket) })),
    comparisonSeries: previousSeries.rows.map((row) => ({ ...row, bucket: dateLabel(row.bucket) })) };
}

async function listProducts(query) {
  const values = [];
  const where = query.q ? (values.push(`%${String(query.q).slice(0, 100)}%`), 'WHERE p.name ILIKE $1 OR p.slug ILIKE $1') : '';
  return paged(`SELECT COUNT(*)::int AS total FROM products p ${where}`,
    `SELECT p.id,p.name,p.slug,p.short_description,p.description,p.status,b.id AS brand_id,b.name AS brand,
      c.id AS category_id,c.name AS category,
      COALESCE(json_agg(DISTINCT jsonb_build_object('id',v.id,'sku',v.sku,'name',v.name,'price_vnd',v.price_vnd,'cost_vnd',v.cost_vnd,'stock_quantity',v.stock_quantity,'is_active',v.is_active)) FILTER (WHERE v.id IS NOT NULL),'[]') AS variants,
      COALESCE((SELECT json_agg(json_build_object('id',pi.id,'image_url',pi.image_url,'alt_text',pi.alt_text,'position',pi.position) ORDER BY pi.position)
        FROM product_images pi WHERE pi.product_id=p.id),'[]') AS images
     FROM products p JOIN brands b ON b.id=p.brand_id JOIN categories c ON c.id=p.category_id
     LEFT JOIN variants v ON v.product_id=p.id ${where} GROUP BY p.id,b.id,c.id ORDER BY p.created_at DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, values, query);
}

async function saveProduct(id, body) {
  const name = cleanText(body.name, 160); const description = cleanText(body.description, 5000);
  const shortDescription = cleanText(body.shortDescription, 400);
  if (name.length < 2 || description.length < 20 || shortDescription.length < 3) fail('Tên, mô tả ngắn hoặc mô tả sản phẩm chưa hợp lệ.');
  if (!isUuid(body.brandId) || !isUuid(body.categoryId)) fail('Cần chọn thương hiệu và danh mục hợp lệ.');
  if (!Array.isArray(body.variants) || body.variants.length < 2 || body.variants.length > 20) fail('Sản phẩm cần từ 2 đến 20 biến thể.');
  if (!Array.isArray(body.images) || body.images.length < 3 || body.images.length > 10) fail('Sản phẩm cần từ 3 đến 10 ảnh.');
  const variants = body.variants.map((item) => ({
    sku: cleanText(item.sku, 40).toUpperCase(), name: cleanText(item.name, 100),
    price: positive(item.priceVnd, 'Giá'), cost: positive(item.costVnd, 'Giá vốn', true), stock: positive(item.stock, 'Tồn kho', true)
  }));
  if (variants.some((v) => !/^[A-Z0-9_-]{3,40}$/.test(v.sku) || v.name.length < 2) || new Set(variants.map((v) => v.sku)).size !== variants.length) fail('SKU phải duy nhất và chỉ chứa chữ, số, gạch ngang hoặc gạch dưới.');
  const images = body.images.map((item, index) => {
    const url = typeof item === 'string' ? item : item.url;
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url) || url.length > 1000) fail('Ảnh phải dùng URL HTTP/HTTPS hợp lệ.');
    return { url, alt: cleanText(typeof item === 'string' ? name : item.alt, 200), position: index + 1 };
  });
  const status = body.status === 'hidden' ? 'hidden' : 'active';
  const slug = slugify(name);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const collision = await client.query(`SELECT id FROM variants WHERE sku=ANY($1::text[]) AND ($2::uuid IS NULL OR product_id<>$2) LIMIT 1`, [variants.map((v) => v.sku), id || null]);
    if (collision.rowCount) fail('SKU đã được dùng bởi sản phẩm khác.');
    const p = id ? await client.query('UPDATE products SET name=$2,slug=$3,brand_id=$4,category_id=$5,short_description=$6,description=$7,status=$8,updated_at=NOW() WHERE id=$1 RETURNING id',
      [id,name,slug,body.brandId,body.categoryId,shortDescription,description,status])
      : await client.query('INSERT INTO products(name,slug,brand_id,category_id,short_description,description,status) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',
        [name,slug,body.brandId,body.categoryId,shortDescription,description,status]);
    if (!p.rowCount) fail('Không tìm thấy sản phẩm.', 404);
    const productId = p.rows[0].id;
    await client.query('DELETE FROM product_images WHERE product_id=$1', [productId]);
    for (const image of images) await client.query('INSERT INTO product_images(product_id,image_url,alt_text,position) VALUES($1,$2,$3,$4)', [productId,image.url,image.alt,image.position]);
    const existing = id ? await client.query('SELECT id,sku FROM variants WHERE product_id=$1', [productId]) : { rows: [] };
    const incomingSkus = variants.map((v) => v.sku);
    for (const old of existing.rows) if (!incomingSkus.includes(old.sku)) await client.query('DELETE FROM variants WHERE id=$1', [old.id]);
    for (const v of variants) {
      await client.query(`INSERT INTO variants(product_id,sku,name,price_vnd,cost_vnd,stock_quantity,is_active)
        VALUES($1,$2,$3,$4,$5,$6,TRUE) ON CONFLICT(sku) DO UPDATE SET product_id=EXCLUDED.product_id,name=EXCLUDED.name,
        price_vnd=EXCLUDED.price_vnd,cost_vnd=EXCLUDED.cost_vnd,stock_quantity=EXCLUDED.stock_quantity,is_active=TRUE,updated_at=NOW()`,
      [productId,v.sku,v.name,v.price,v.cost,v.stock]);
    }
    await client.query('COMMIT');
    return productId;
  } catch (error) { await client.query('ROLLBACK'); if (error.code === '23505') fail('Tên/slug sản phẩm hoặc SKU đã được sử dụng.'); throw error; }
  finally { client.release(); }
}

async function deleteProduct(id) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM cart_items WHERE variant_id IN (SELECT id FROM variants WHERE product_id=$1)', [id]);
    const result = await client.query('DELETE FROM products WHERE id=$1 RETURNING id', [id]);
    if (!result.rowCount) fail('Không tìm thấy sản phẩm.', 404);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function listUsers(query) {
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '';
  const values = q ? [`%${q}%`] : [];
  const where = q ? 'WHERE role=\'customer\' AND (email ILIKE $1 OR full_name ILIKE $1)' : "WHERE role='customer'";
  return paged(`SELECT COUNT(*)::int AS total FROM users ${where}`,
    `SELECT id,email,full_name,is_banned,loyalty_balance,created_at FROM users ${where}
     ORDER BY created_at DESC,id LIMIT $${values.length+1} OFFSET $${values.length+2}`, values, query);
}

async function updateUser(id, body) {
  if (!isUuid(id)) fail('Người dùng không hợp lệ.');
  const name = cleanText(body.fullName, 100); const email = normalizeEmail(body.email);
  if (name.length < 2 || !validEmail(email)) fail('Tên hoặc email không hợp lệ.');
  try {
    const { rows } = await db.query(`UPDATE users SET full_name=$2,email=$3,is_banned=$4,updated_at=NOW()
      WHERE id=$1 AND role='customer' RETURNING id,email,full_name,is_banned,loyalty_balance,created_at`,
    [id,name,email,body.isBanned === true]);
    if (!rows.length) fail('Không tìm thấy customer.', 404);
    return rows[0];
  } catch (error) { if (error.code === '23505') fail('Email đã được sử dụng.', 409); throw error; }
}

function dateFilter(query) {
  const values = []; const clauses = [];
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const range = query.range;
  if (range === 'today') { values.push(today); clauses.push(`o.created_at >= ($${values.length}::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AND o.created_at < (($${values.length}::date + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')`); }
  else if (range === 'yesterday') { values.push(today); clauses.push(`o.created_at >= (($${values.length}::date - 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AND o.created_at < ($${values.length}::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')`); }
  else if (range === 'week') clauses.push("o.created_at >= (date_trunc('week',NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh')");
  else if (range === 'month') clauses.push("o.created_at >= (date_trunc('month',NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh')");
  else if (range === 'custom') {
    const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
    if (!validDate(query.from) || !validDate(query.to) || query.from > query.to) fail('Khoảng ngày không hợp lệ.');
    values.push(query.from,query.to); clauses.push(`o.created_at >= ($${values.length-1}::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AND o.created_at < (($${values.length}::date + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')`);
  } else if (range) fail('Bộ lọc thời gian không hợp lệ.');
  return { values, where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '' };
}

async function listOrders(query) {
  const { values, where } = dateFilter(query);
  return paged(`SELECT COUNT(*)::int AS total FROM orders o ${where}`,
    `SELECT o.id,o.order_number,o.email,o.recipient_name,o.status,o.total_vnd,o.created_at,u.full_name AS customer_name
     FROM orders o JOIN users u ON u.id=o.user_id ${where} ORDER BY o.created_at DESC,o.id DESC
     LIMIT $${values.length+1} OFFSET $${values.length+2}`, values, query);
}

async function getOrder(id) {
  const { rows } = await db.query(`SELECT o.*,u.full_name AS customer_name FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=$1`, [id]);
  if (!rows.length) return null;
  const order = rows[0];
  const [items,history] = await Promise.all([
    db.query('SELECT * FROM order_items WHERE order_id=$1 ORDER BY id', [id]),
    db.query(`SELECT h.status,h.note,h.created_at,u.full_name AS changed_by FROM order_status_history h
      LEFT JOIN users u ON u.id=h.changed_by_user_id WHERE h.order_id=$1 ORDER BY h.created_at DESC,h.id DESC`, [id])
  ]);
  return { ...order, items: items.rows, statusHistory: history.rows };
}

async function updateOrderStatus(id, actorId, body) {
  if (!ORDER_STATUSES.includes(body.status)) fail('Trạng thái đơn hàng không hợp lệ.');
  const note = cleanText(body.note || '', 300);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const order = await client.query('SELECT status FROM orders WHERE id=$1 FOR UPDATE', [id]);
    if (!order.rowCount) fail('Không tìm thấy đơn hàng.', 404);
    if (order.rows[0].status === 'cancelled' && body.status !== 'cancelled') fail('Đơn đã hủy không thể chuyển lại trạng thái khác.');
    await client.query('UPDATE orders SET status=$2,updated_at=NOW() WHERE id=$1', [id,body.status]);
    await client.query('INSERT INTO order_status_history(order_id,status,note,changed_by_user_id) VALUES($1,$2,$3,$4)', [id,body.status,note,actorId]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  return getOrder(id);
}

async function listDiscounts(query) {
  const { rows } = await db.query(`SELECT d.id,d.code,d.discount_type,d.value,d.used_count,d.max_uses,d.is_active,d.created_at,
      COALESCE(json_agg(json_build_object('id',o.id,'order_number',o.order_number,'created_at',o.created_at)
        ORDER BY o.created_at DESC) FILTER (WHERE o.id IS NOT NULL),'[]') AS orders
    FROM discounts d LEFT JOIN discount_redemptions r ON r.discount_id=d.id LEFT JOIN orders o ON o.id=r.order_id
    GROUP BY d.id ORDER BY d.created_at DESC`);
  return { data: rows };
}

async function createDiscount(adminId, body) {
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  const type = body.type;
  if (!/^[A-Z0-9]{5}$/.test(code)) fail('Mã giảm giá phải có đúng 5 ký tự chữ-số.');
  if (!['percent','fixed'].includes(type)) fail('Kiểu giảm giá không hợp lệ.');
  const value = positive(body.value, 'Giá trị giảm');
  if (type === 'percent' && value > 100) fail('Mức giảm phần trăm tối đa là 100.');
  const maxUses = positive(body.maxUses === undefined ? 10 : body.maxUses, 'Lượt dùng tối đa');
  if (maxUses > 10) fail('Mỗi mã được dùng tối đa 10 lượt.');
  try {
    const { rows } = await db.query(`INSERT INTO discounts(code,discount_type,value,max_uses,created_by_admin_id)
      VALUES($1,$2,$3,$4,$5) RETURNING id,code,discount_type,value,used_count,max_uses,is_active,created_at`, [code,type,value,maxUses,adminId]);
    return rows[0];
  } catch (error) { if (error.code === '23505') fail('Mã giảm giá đã tồn tại.', 409); throw error; }
}

module.exports = { ORDER_STATUSES, analytics, createDiscount, dashboard, deleteProduct, getOrder, listDiscounts, listOrders, listProducts, listUsers, saveProduct, updateOrderStatus, updateUser };
