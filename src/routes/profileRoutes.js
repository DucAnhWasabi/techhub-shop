const express = require('express');
const controller = require('../controllers/profileController');
const { requireCustomer } = require('../middleware/auth');

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
router.use(requireCustomer);
router.get('/', wrap(controller.profile));
router.patch('/', wrap(controller.updateProfile));
router.patch('/password', wrap(controller.changePassword));
router.get('/addresses', wrap(controller.listAddresses));
router.post('/addresses', wrap(controller.addAddress));
router.patch('/addresses/:id', wrap(controller.updateAddress));
router.patch('/addresses/:id/default', wrap(controller.setDefaultAddress));
router.delete('/addresses/:id', wrap(controller.deleteAddress));

module.exports = router;
