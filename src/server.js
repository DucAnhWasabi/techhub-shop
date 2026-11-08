require('dotenv').config();
const app = require('./app');
const db = require('./config/db');
const redis = require('./config/redis');

const port = Number(process.env.PORT || 3000);

async function start() {
  await db.query('SELECT 1');
  await redis.ping();
  app.listen(port, '0.0.0.0', () => console.log(`TechHub API đang chạy tại cổng ${port}`));
}

start().catch((error) => {
  console.error('Không thể khởi động API:', error.message);
  process.exit(1);
});
