const express = require('express');
const controller = require('../controllers/cartController');

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
router.get('/', wrap(controller.get));
router.post('/items', wrap(controller.add));
router.patch('/items/:id', wrap(controller.update));
router.delete('/items/:id', wrap(controller.remove));
router.delete('/', wrap(controller.clear));

module.exports = router;
