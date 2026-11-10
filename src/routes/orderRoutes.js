const express = require('express');
const controller = require('../controllers/orderController');
const { requireCustomer } = require('../middleware/auth');

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
router.use(requireCustomer);
router.get('/', wrap(controller.list));
router.get('/:id', wrap(controller.detail));

module.exports = router;
