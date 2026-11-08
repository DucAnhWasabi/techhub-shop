const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const passport = require('./config/passport');
const redis = require('./config/redis');
const { createToken, csrfProtection } = require('./middleware/csrf');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const { requireCustomer } = require('./middleware/auth');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(session({
  name: 'techhub.sid',
  store: new RedisStore({ client: redis, prefix: 'techhub:sess:' }),
  secret: process.env.SESSION_SECRET || 'local-development-session-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'techhub-api' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'techhub-api' }));
app.get('/api/auth/csrf', (req, res) => res.json({ csrfToken: createToken(req) }));
app.get('/api/auth/providers', (_req, res) => res.json({
  google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  facebook: Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET)
}));
app.use('/api', csrfProtection);
app.use('/api/auth', authRoutes);
app.use('/api/me', profileRoutes);
app.get('/api/profile', requireCustomer, async (req, res, next) => {
  try {
    const users = require('./services/users');
    res.json({ data: await users.getProfile(req.user.id) });
  } catch (error) { next(error); }
});
app.get('/api/products', async (_req, res, next) => {
  try {
    const db = require('./config/db');
    const { rows } = await db.query(
      `SELECT p.id, p.name, p.slug, p.short_description, b.name AS brand,
        c.name AS category, MIN(v.price_vnd) AS price_vnd,
        COALESCE(SUM(v.stock_quantity), 0)::int AS stock_quantity
       FROM products p JOIN brands b ON b.id=p.brand_id
       JOIN categories c ON c.id=p.category_id LEFT JOIN variants v ON v.product_id=p.id
       WHERE p.status='active' GROUP BY p.id,b.name,c.name ORDER BY p.name LIMIT 100`
    );
    res.json({ data: rows, page: 1, totalPages: 1 });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error.message);
  const status = Number.isInteger(error.status) ? error.status : 500;
  res.status(status).json({ error: status < 500 ? error.message : 'Đã có lỗi máy chủ.' });
});

module.exports = app;
