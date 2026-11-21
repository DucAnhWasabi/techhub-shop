const express = require('express');
const controller = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
router.use(requireAdmin);
router.get('/dashboard', wrap(controller.dashboard));
router.get('/analytics', wrap(controller.analytics));
router.get('/categories', wrap(controller.categories));
router.get('/brands', wrap(controller.brands));
router.get('/products', wrap(controller.products));
router.post('/products', wrap(controller.createProduct));
router.patch('/products/:id', wrap(controller.updateProduct));
router.delete('/products/:id', wrap(controller.deleteProduct));
router.get('/users', wrap(controller.users));
router.patch('/users/:id', wrap(controller.updateUser));
router.get('/orders', wrap(controller.orders));
router.get('/orders/:id', wrap(controller.order));
router.patch('/orders/:id/status', wrap(controller.updateOrderStatus));
router.get('/discounts', wrap(controller.discounts));
router.post('/discounts', wrap(controller.createDiscount));

module.exports = router;
