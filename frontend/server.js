require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/assets', express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'techhub-frontend' }));
app.get('/', (_req, res) => res.render('home'));
app.listen(Number(process.env.WEB_PORT || 3001), '0.0.0.0', () => {
  console.log(`TechHub frontend đang chạy tại cổng ${process.env.WEB_PORT || 3001}`);
});
