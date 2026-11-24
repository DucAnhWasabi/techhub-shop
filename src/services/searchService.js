const { Client } = require('@elastic/elasticsearch');
const db = require('../config/db');

const INDEX = 'techhub-products';
const client = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200', requestTimeout: 3000, maxRetries: 1 });
let indexReady;
let hasSynced = false;

async function ensureIndex() {
  if (indexReady) return indexReady;
  indexReady = (async () => {
    const exists = await client.indices.exists({ index: INDEX });
    if (!exists) {
      try {
        await client.indices.create({
          index: INDEX,
          mappings: { properties: {
            name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            short_description: { type: 'text' }, description: { type: 'text' },
            brand: { type: 'text' }, category: { type: 'text' },
            price_vnd: { type: 'long' }, stock_quantity: { type: 'integer' }
          } }
        });
      } catch (error) {
        // Hai backend có thể khởi động cùng lúc và cùng tạo index.
        if (error.meta?.statusCode !== 400) throw error;
      }
    }
  })().catch((error) => { indexReady = null; throw error; });
  return indexReady;
}

async function loadDocuments() {
  const { rows } = await db.query(`SELECT p.id,p.name,p.short_description,p.description,b.name AS brand,c.name AS category,
      COALESCE((SELECT MIN(price_vnd) FROM variants v WHERE v.product_id=p.id AND v.is_active),0) AS price_vnd,
      COALESCE((SELECT SUM(stock_quantity) FROM variants v WHERE v.product_id=p.id AND v.is_active),0)::int AS stock_quantity
    FROM products p JOIN brands b ON b.id=p.brand_id JOIN categories c ON c.id=p.category_id`);
  return rows;
}

function documentFor(row) {
  return { name: row.name, short_description: row.short_description, description: row.description,
    brand: row.brand, category: row.category, price_vnd: Number(row.price_vnd), stock_quantity: Number(row.stock_quantity) };
}

async function syncAll() {
  await ensureIndex();
  const rows = await loadDocuments();
  if (rows.length) {
    const operations = rows.flatMap((row) => [{ index: { _index: INDEX, _id: row.id } }, documentFor(row)]);
    const result = await client.bulk({ operations, refresh: true });
    if (result.errors) throw new Error('Có sản phẩm chưa được đồng bộ vào index.');
  }
  hasSynced = true;
  console.log(`Elasticsearch: đã đồng bộ ${rows.length} sản phẩm.`);
}

async function indexProduct(productId) {
  try {
    await ensureIndex();
    const { rows } = await db.query(`SELECT p.id,p.name,p.short_description,p.description,b.name AS brand,c.name AS category,
        COALESCE((SELECT MIN(price_vnd) FROM variants v WHERE v.product_id=p.id AND v.is_active),0) AS price_vnd,
        COALESCE((SELECT SUM(stock_quantity) FROM variants v WHERE v.product_id=p.id AND v.is_active),0)::int AS stock_quantity
      FROM products p JOIN brands b ON b.id=p.brand_id JOIN categories c ON c.id=p.category_id WHERE p.id=$1`, [productId]);
    if (!rows.length) return;
    await client.index({ index: INDEX, id: productId, document: documentFor(rows[0]), refresh: true });
  } catch (error) { console.error('Elasticsearch chưa đồng bộ sản phẩm:', error.message); }
}

async function removeProduct(productId) {
  try {
    await ensureIndex();
    await client.delete({ index: INDEX, id: productId, refresh: true });
  } catch (error) {
    if (error.meta?.statusCode !== 404) console.error('Elasticsearch chưa xóa sản phẩm:', error.message);
  }
}

async function searchIds(query) {
  try {
    if (!hasSynced) await syncAll();
    else await ensureIndex();
    const result = await client.search({ index: INDEX, size: 10000, query: {
      multi_match: { query, fields: ['name^4', 'brand^2', 'category^2', 'short_description^2', 'description'], fuzziness: 'AUTO' }
    } });
    return result.hits.hits.map((hit) => hit._id);
  } catch (error) {
    console.error('Elasticsearch không khả dụng, chuyển sang tìm kiếm PostgreSQL:', error.message);
    return null;
  }
}

async function close() { await client.close(); }

module.exports = { close, indexProduct, removeProduct, searchIds, syncAll };
