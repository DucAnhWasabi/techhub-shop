require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/assets', express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'techhub-frontend' }));
app.get('/', (_req, res) => res.render('home'));
app.get('/products', (_req, res) => res.render('catalog', { pageTitle: 'Tất cả sản phẩm', categorySlug: '' }));
app.get('/categories/:slug', (req, res) => res.render('catalog', { pageTitle: 'Danh mục sản phẩm', categorySlug: req.params.slug }));
app.get('/search', (_req, res) => res.render('catalog', { pageTitle: 'Kết quả tìm kiếm', categorySlug: '' }));
app.get('/products/:slug', (_req, res) => res.render('product'));
app.get('/cart', (_req, res) => res.render('cart'));
app.get('/checkout', (_req, res) => res.render('checkout'));
app.get('/orders', (_req, res) => res.render('orders'));
app.get('/orders/:id', (_req, res) => res.render('order-detail'));
app.get('/login', (_req, res) => res.render('auth', { mode: 'login', title: 'Đăng nhập' }));
app.get('/register', (_req, res) => res.render('auth', { mode: 'register', title: 'Tạo tài khoản' }));
app.get('/forgot-password', (_req, res) => res.render('auth', { mode: 'forgot', title: 'Khôi phục mật khẩu' }));
app.get('/reset-password', (_req, res) => res.render('auth', { mode: 'reset', title: 'Đặt mật khẩu mới' }));
app.get('/account', (_req, res) => res.render('account'));
app.listen(Number(process.env.WEB_PORT || 3001), '0.0.0.0', () => {
  console.log(`TechHub frontend đang chạy tại cổng ${process.env.WEB_PORT || 3001}`);
});
