const db = require('../config/db');

const SORTS = {
  name_asc: 'p.name ASC',
  name_desc: 'p.name DESC',
  price_asc: 'price_vnd ASC, p.name ASC',
  price_desc: 'price_vnd DESC, p.name ASC',
  newest: 'p.created_at DESC, p.name ASC',
  best_sellers: 'sold_count DESC, p.created_at DESC, p.name ASC'
};

function parseInteger(value, fallback, { min = 1, max = 100000000000 } = {}) {
  if (value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(String(value))) throw Object.assign(new Error('Tham số phân trang hoặc giá không hợp lệ.'), { status: 400 });
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw Object.assign(new Error('Tham số phân trang hoặc giá vượt giới hạn.'), { status: 400 });
  }
  return number;
}

function parseFilters(query = {}) {
  const page = parseInteger(query.page, 1, { max: 100000 });
  const limit = parseInteger(query.limit, 12, { min: 1, max: 24 });
  const minPrice = parseInteger(query.minPrice, null, { min: 0 });
  const maxPrice = parseInteger(query.maxPrice, null, { min: 0 });
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    throw Object.assign(new Error('Giá tối thiểu không được lớn hơn giá tối đa.'), { status: 400 });
  }
  const sort = query.sort || 'name_asc';
  if (!SORTS[sort]) throw Object.assign(new Error('Tiêu chí sắp xếp không hợp lệ.'), { status: 400 });
  return {
    page, limit, offset: (page - 1) * limit, minPrice, maxPrice, sort,
    brand: typeof query.brand === 'string' ? query.brand.slice(0, 100) : '',
    category: typeof query.category === 'string' ? query.category.slice(0, 100) : '',
    q: typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '',
    inStock: query.inStock === 'true'
  };
}

function buildWhere(filters, source) {
  const clauses = ["p.status='active'"];
  const values = [];
  const add = (clause, value) => { values.push(value); clauses.push(clause.replace('?', `$${values.length}`)); };
  if (filters.q) {
    const value = `%${filters.q}%`;
    values.push(value, value, value);
    const last = values.length;
    clauses.push(`(p.name ILIKE $${last - 2} OR p.short_description ILIKE $${last - 1} OR b.name ILIKE $${last})`);
  }
  if (filters.category) add('c.slug=?', filters.category);
  if (filters.brand) add('b.slug=?', filters.brand);
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    const tests = [];
    const priceValues = [];
    if (filters.minPrice !== null) { priceValues.push(filters.minPrice); tests.push(`v.price_vnd >= $${values.length + priceValues.length}`); }
    if (filters.maxPrice !== null) { priceValues.push(filters.maxPrice); tests.push(`v.price_vnd <= $${values.length + priceValues.length}`); }
    values.push(...priceValues);
    clauses.push(`EXISTS (SELECT 1 FROM variants v WHERE v.product_id=p.id AND v.is_active=TRUE AND ${tests.join(' AND ')})`);
  }
  if (filters.inStock) clauses.push('EXISTS (SELECT 1 FROM variants vs WHERE vs.product_id=p.id AND vs.is_active=TRUE AND vs.stock_quantity>0)');
  return { where: clauses.join(' AND '), values };
}

const listSelect = `
  SELECT p.id,p.name,p.slug,p.short_description,p.created_at,b.name AS brand,b.slug AS brand_slug,
    c.name AS category,c.slug AS category_slug,
    COALESCE((SELECT MIN(v.price_vnd) FROM variants v WHERE v.product_id=p.id AND v.is_active=TRUE),0) AS price_vnd,
    COALESCE((SELECT SUM(v.stock_quantity) FROM variants v WHERE v.product_id=p.id AND v.is_active=TRUE),0)::int AS stock_quantity,
    (SELECT pi.image_url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.position LIMIT 1) AS image_url,
    COALESCE((SELECT ROUND(AVG(r.stars)::numeric,1) FROM ratings r WHERE r.product_id=p.id),0) AS average_rating,
    (SELECT COUNT(*)::int FROM ratings r WHERE r.product_id=p.id) AS rating_count,
    COALESCE((SELECT SUM(oi.quantity) FROM order_items oi JOIN variants ov ON ov.id=oi.variant_id
      JOIN orders o ON o.id=oi.order_id WHERE ov.product_id=p.id AND o.status<>'cancelled'),0)::int AS sold_count
  FROM products p JOIN brands b ON b.id=p.brand_id JOIN categories c ON c.id=p.category_id`;

async function listProducts(query, source = 'catalog') {
  const filters = parseFilters(query);
  const { where, values } = buildWhere(filters, source);
  const count = await db.query(
    `SELECT COUNT(*)::int AS total FROM products p
     JOIN brands b ON b.id=p.brand_id JOIN categories c ON c.id=p.category_id WHERE ${where}`,
    values
  );
  const total = count.rows[0].total;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));
  const page = Math.min(filters.page, totalPages);
  const order = source === 'new' ? SORTS.newest : source === 'best' ? SORTS.best_sellers : SORTS[filters.sort];
  const pageValues = [...values, filters.limit, (page - 1) * filters.limit];
  const { rows } = await db.query(
    `${listSelect} WHERE ${where} ORDER BY ${order} LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues
  );
  return { data: rows, page, limit: filters.limit, total, totalPages };
}

async function getCategories() {
  const { rows } = await db.query(
    `SELECT c.id,c.name,c.slug,c.description,COUNT(DISTINCT p.id)::int AS product_count
     FROM categories c LEFT JOIN products p ON p.category_id=c.id AND p.status='active'
     GROUP BY c.id ORDER BY c.name`
  );
  return rows;
}

async function getBrands() {
  const { rows } = await db.query(
    `SELECT b.id,b.name,b.slug,COUNT(DISTINCT p.id)::int AS product_count
     FROM brands b LEFT JOIN products p ON p.brand_id=b.id AND p.status='active'
     GROUP BY b.id ORDER BY b.name`
  );
  return rows;
}

async function getProduct(slug, userId) {
  const { rows } = await db.query(
    `SELECT p.id,p.name,p.slug,p.short_description,p.description,p.created_at,
      b.name AS brand,b.slug AS brand_slug,c.name AS category,c.slug AS category_slug,
      COALESCE((SELECT ROUND(AVG(r.stars)::numeric,1) FROM ratings r WHERE r.product_id=p.id),0) AS average_rating,
      (SELECT COUNT(*)::int FROM ratings r WHERE r.product_id=p.id) AS rating_count,
      (SELECT stars FROM ratings WHERE product_id=p.id AND user_id=$2) AS my_rating
     FROM products p JOIN brands b ON b.id=p.brand_id JOIN categories c ON c.id=p.category_id
     WHERE p.slug=$1 AND p.status='active'`, [slug,userId || null]
  );
  if (!rows.length) return null;
  const product = rows[0];
  const [images, variants] = await Promise.all([
    db.query('SELECT id,image_url,alt_text,position FROM product_images WHERE product_id=$1 ORDER BY position,id', [product.id]),
    db.query('SELECT id,sku,name,attributes,price_vnd,stock_quantity,is_active FROM variants WHERE product_id=$1 AND is_active=TRUE ORDER BY price_vnd,name', [product.id])
  ]);
  return { ...product, images: images.rows, variants: variants.rows };
}

async function getReviews(productId, query) {
  const page = parseInteger(query.page, 1, { max: 100000 });
  const limit = parseInteger(query.limit, 10, { min: 1, max: 30 });
  const totalResult = await db.query('SELECT COUNT(*)::int AS total FROM reviews WHERE product_id=$1', [productId]);
  const total = totalResult.rows[0].total;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, totalPages);
  const { rows } = await db.query(
    `SELECT id,author_name,body,created_at FROM reviews WHERE product_id=$1
     ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`, [productId,limit,(currentPage-1)*limit]
  );
  return { data: rows, page: currentPage, limit, total, totalPages };
}

module.exports = { getBrands, getCategories, getProduct, getReviews, listProducts };
