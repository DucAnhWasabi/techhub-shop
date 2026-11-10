const orders = require('../services/orderService');
const { isUuid } = require('../services/validation');

async function list(req, res) {
  res.json(await orders.listOrders(req.user.id, req.query));
}

async function detail(req, res) {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
  const data = await orders.getOrder(req.user.id, req.params.id);
  if (!data) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
  res.json({ data });
}

module.exports = { detail, list };
