require('dotenv').config();
const app = require('./app');
const db = require('./config/db');
const Redis = require('ioredis');

const port = Number(process.env.PORT || 3000);
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: 2,
  retryStrategy: (attempt) => Math.min(attempt * 200, 2000)
});
redis.on('error', (error) => console.error('Lỗi kết nối Redis:', error.message));

async function start() {
  await db.query('SELECT 1');
  await redis.ping();
  app.listen(port, '0.0.0.0', () => console.log(`TechHub API đang chạy tại cổng ${port}`));
}

start().catch((error) => {
  console.error('Không thể khởi động API:', error.message);
  process.exit(1);
});
