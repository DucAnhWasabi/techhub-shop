const admin = require('../services/adminService');
const catalog = require('../services/catalogService');
const { isUuid } = require('../services/validation');

const dashboard = async (_req, res) => res.json({ data: await admin.dashboard() });
const analytics = async (req, res) => res.json({ data: await admin.analytics(req.query) });
const categories = async (_req, res) => res.json({ data: await catalog.getCategories() });
const brands = async (_req, res) => res.json({ data: await catalog.getBrands() });
const products = async (req, res) => res.json(await admin.listProducts(req.query));
const createProduct = async (req, res) => res.status(201).json({ data: { id: await admin.saveProduct(null, req.body) } });
const updateProduct = async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
  res.json({ data: { id: await admin.saveProduct(req.params.id, req.body) } });
};
const deleteProduct = async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
  await admin.deleteProduct(req.params.id); res.json({ message: 'Đã xóa sản phẩm.' });
};
const users = async (req, res) => res.json(await admin.listUsers(req.query));
const updateUser = async (req, res) => res.json({ data: await admin.updateUser(req.params.id, req.body) });
const orders = async (req, res) => res.json(await admin.listOrders(req.query));
const order = async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
  const data = await admin.getOrder(req.params.id);
  if (!data) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
  res.json({ data });
};
const updateOrderStatus = async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
  res.json({ data: await admin.updateOrderStatus(req.params.id, req.user.id, req.body) });
};
const discounts = async (req, res) => res.json(await admin.listDiscounts(req.query));
const createDiscount = async (req, res) => res.status(201).json({ data: await admin.createDiscount(req.user.id, req.body) });

module.exports = { analytics, brands, categories, createDiscount, createProduct, dashboard, deleteProduct,
  discounts, order, orders, products, updateOrderStatus, updateProduct, updateUser, users };
