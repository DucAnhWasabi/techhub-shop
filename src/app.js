const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const passport = require('./config/passport');
const redis = require('./config/redis');
const { createToken, csrfProtection } = require('./middleware/csrf');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const cartRoutes = require('./routes/cartRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { requireCustomer } = require('./middleware/auth');
const os = require('os');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
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
app.get('/api/instance', (_req, res) => res.json({ service: 'techhub-api', hostname: process.env.HOSTNAME || os.hostname() }));
app.get('/api/auth/csrf', (req, res) => res.json({ csrfToken: createToken(req) }));
app.get('/api/auth/providers', (_req, res) => res.json({
  google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  facebook: Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET)
}));
// Chỉ trả về vai trò cần thiết để frontend hiển thị thanh điều hướng phù hợp.
app.get('/api/auth/session', (req, res) => res.json({
  data: req.user ? { role: req.user.role } : null
}));
app.use('/api', csrfProtection);
app.use('/api/auth', authRoutes);
app.use('/api/me', profileRoutes);
app.use('/api', catalogRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/me/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.get('/api/profile', requireCustomer, async (req, res, next) => {
  try {
    const users = require('./services/users');
    res.json({ data: await users.getProfile(req.user.id) });
  } catch (error) { next(error); }
});
app.use((error, _req, res, _next) => {
  console.error(error.message);
  const status = Number.isInteger(error.status) ? error.status : 500;
  res.status(status).json({ error: status < 500 ? error.message : 'Đã có lỗi máy chủ.' });
});

module.exports = app;
