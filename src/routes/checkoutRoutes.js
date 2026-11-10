const express = require('express');
const controller = require('../controllers/checkoutController');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
router.post('/quote', rateLimit({ prefix: 'checkout', limit: 30 }), wrap(controller.quote));
router.post('/place-order', rateLimit({ prefix: 'place-order', limit: 8 }), wrap(controller.placeOrder));

module.exports = router;
