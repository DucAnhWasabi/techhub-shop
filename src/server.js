require('dotenv').config();
const http = require('http');
const app = require('./app');
const db = require('./config/db');
const redis = require('./config/redis');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { isUuid } = require('./services/validation');

const port = Number(process.env.PORT || 3000);
const pubClient = redis.duplicate();
const subClient = redis.duplicate();

async function start() {
  await db.query('SELECT 1');
  await Promise.all([redis.ping(), pubClient.ping(), subClient.ping()]);
  const server = http.createServer(app);
  const io = new Server(server, { path: '/socket.io', serveClient: true });
  io.adapter(createAdapter(pubClient, subClient));
  app.locals.io = io;
  io.on('connection', (socket) => {
    socket.on('product:join', async (productId) => {
      if (!isUuid(productId)) return;
      try {
        const result = await db.query("SELECT id FROM products WHERE id=$1 AND status='active'", [productId]);
        if (!result.rowCount) return;
        if (socket.data.productRoom) await socket.leave(socket.data.productRoom);
        socket.data.productRoom = `product:${productId}`;
        await socket.join(socket.data.productRoom);
      } catch (error) { console.error('Không thể tham gia phòng sản phẩm:', error.message); }
    });
  });
  server.listen(port, '0.0.0.0', () => console.log(`TechHub API đang chạy tại cổng ${port}`));
}

start().catch((error) => {
  console.error('Không thể khởi động API:', error.message);
  process.exit(1);
});
