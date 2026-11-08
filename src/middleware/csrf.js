const crypto = require('crypto');

function createToken(req) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  return req.session.csrfToken;
}

function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const expected = req.session && req.session.csrfToken;
  const supplied = req.get('x-csrf-token') || req.body?._csrf;
  const expectedBytes = typeof expected === 'string' ? Buffer.from(expected) : Buffer.alloc(0);
  const suppliedBytes = typeof supplied === 'string' ? Buffer.from(supplied) : Buffer.alloc(0);
  if (!expectedBytes.length || !suppliedBytes.length || expectedBytes.length !== suppliedBytes.length ||
      !crypto.timingSafeEqual(expectedBytes, suppliedBytes)) {
    return res.status(403).json({ error: 'Phiên bảo mật hết hạn. Hãy tải lại trang và thử lại.' });
  }
  next();
}

module.exports = { createToken, csrfProtection };
