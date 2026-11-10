const cart = require('../services/cartService');
const { isUuid } = require('../services/validation');

async function get(req, res) {
  res.json({ data: await cart.getCart(req, res) });
}

async function add(req, res) {
  if (!isUuid(req.body.variantId)) return res.status(400).json({ error: 'Biến thể không hợp lệ.' });
  const quantity = req.body.quantity === undefined ? 1 : Number(req.body.quantity);
  res.status(201).json({ data: await cart.addItem(req, res, req.body.variantId, quantity) });
}

async function update(req, res) {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Không tìm thấy mặt hàng.' });
  const quantity = Number(req.body.quantity);
  res.json({ data: await cart.updateItem(req, res, req.params.id, quantity) });
}

async function remove(req, res) {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Không tìm thấy mặt hàng.' });
  res.json({ data: await cart.removeItem(req, res, req.params.id) });
}

async function clear(req, res) {
  res.json({ data: await cart.clearCart(req, res) });
}

module.exports = { add, clear, get, remove, update };
