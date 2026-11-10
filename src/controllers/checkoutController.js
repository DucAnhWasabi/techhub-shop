const checkout = require('../services/checkoutService');

async function quote(req, res) {
  res.json({ data: await checkout.quote(req, res, req.body) });
}

async function placeOrder(req, res) {
  res.status(201).json({ data: await checkout.placeOrder(req, res, req.body) });
}

module.exports = { placeOrder, quote };
