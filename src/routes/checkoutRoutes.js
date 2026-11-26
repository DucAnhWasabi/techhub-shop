const express = require('express');
const controller = require('../controllers/checkoutController');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
router.post('/quote', rateLimit({ prefix: 'checkout', limit: 30 }), wrap(controller.quote));
router.post('/place-order', rateLimit({ prefix: 'place-order', limit: 8 }), wrap(controller.placeOrder));
router.get('/vnpay-return', wrap(controller.vnpayReturn));
router.get('/vnpay-ipn', wrap(controller.vnpayIpn));

module.exports = router;
