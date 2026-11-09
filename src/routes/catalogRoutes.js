const express = require('express');
const catalog = require('../controllers/catalogController');
const reviews = require('../controllers/reviewController');
const { requireCustomer } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
router.get('/categories', wrap(catalog.categories));
router.get('/brands', wrap(catalog.brands));
router.get('/products', wrap(catalog.products));
router.get('/products/new', wrap(catalog.newest));
router.get('/products/best-sellers', wrap(catalog.bestSellers));
router.get('/products/search', wrap(catalog.products));
router.get('/products/:slug', wrap(catalog.product));
router.get('/products/:id/reviews', wrap(catalog.reviews));
router.post('/products/:id/reviews', rateLimit({ prefix: 'review', limit: 8 }), wrap(reviews.comment));
router.post('/products/:id/ratings', requireCustomer, wrap(reviews.rate));

module.exports = router;
