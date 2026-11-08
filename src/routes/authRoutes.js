const express = require('express');
const controller = require('../controllers/authController');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const loginLimit = rateLimit({ prefix: 'auth', limit: 10 });

router.post('/register', loginLimit, wrap(controller.register));
router.post('/login', loginLimit, wrap(controller.login));
router.post('/logout', wrap(controller.logout));
router.post('/forgot-password', rateLimit({ prefix: 'forgot', limit: 5 }), wrap(controller.forgotPassword));
router.post('/reset-password', rateLimit({ prefix: 'reset', limit: 10 }), wrap(controller.resetPassword));
router.get('/google', wrap((req, res, next) => controller.oauthStart('google', req, res, next)));
router.get('/google/callback', controller.oauthCallback('google'));
router.get('/facebook', wrap((req, res, next) => controller.oauthStart('facebook', req, res, next)));
router.get('/facebook/callback', controller.oauthCallback('facebook'));

module.exports = router;
