function requireCustomer(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Vui lòng đăng nhập.' });
  if (req.user.is_banned) return res.status(403).json({ error: 'Tài khoản đã bị khóa.' });
  next();
}

module.exports = { requireCustomer };
