const redis = require('../config/redis');

function rateLimit({ prefix, limit = 10, windowSeconds = 900 }) {
  return async (req, res, next) => {
    try {
      const key = `rate:${prefix}:${req.ip}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSeconds);
      res.set('RateLimit-Limit', String(limit));
      res.set('RateLimit-Remaining', String(Math.max(0, limit - count)));
      if (count > limit) return res.status(429).json({ error: 'Bạn thao tác quá nhiều. Hãy thử lại sau ít phút.' });
      next();
    } catch (error) { next(error); }
  };
}

module.exports = { rateLimit };
