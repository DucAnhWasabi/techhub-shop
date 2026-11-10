function requireCustomer(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Vui lòng đăng nhập.' });
  if (req.user.is_banned) return res.status(403).json({ error: 'Tài khoản đã bị khóa.' });
  if (req.user.role !== 'customer') return res.status(403).json({ error: 'Chức năng này dành cho customer.' });
  next();
}

module.exports = { requireCustomer };
