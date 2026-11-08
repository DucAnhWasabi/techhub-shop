const passport = require('../config/passport');
const users = require('../services/users');
const auth = require('../services/auth');

function loginSession(req, user) {
  return new Promise((resolve, reject) => {
    req.logIn(user, (error) => error ? reject(error) : resolve());
  });
}

async function register(req, res) {
  const user = await users.registerWithPassword(req.body);
  await loginSession(req, user);
  res.status(201).json({ data: user });
}

async function login(req, res) {
  const user = await auth.authenticate(req.body.email, req.body.password);
  if (!user) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
  await loginSession(req, user);
  res.json({ data: user });
}

async function logout(req, res, next) {
  req.logout((error) => {
    if (error) return next(error);
    req.session.destroy((destroyError) => {
      if (destroyError) return next(destroyError);
      res.clearCookie('techhub.sid');
      res.json({ message: 'Đã đăng xuất.' });
    });
  });
}

async function forgotPassword(req, res) {
  await auth.requestPasswordReset(req.body.email);
  res.json({ message: 'Nếu email thuộc một tài khoản, hướng dẫn khôi phục sẽ được gửi.' });
}

async function resetPassword(req, res) {
  await auth.resetPassword(req.body.token, req.body.newPassword);
  res.json({ message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập.' });
}

async function oauthStart(provider, req, res, next) {
  if (!passport._strategy(provider)) {
    return res.status(503).json({ error: `OAuth ${provider} chưa được cấu hình. Hãy thêm thông tin ứng dụng vào .env.` });
  }
  const scopes = provider === 'google' ? ['profile', 'email'] : ['email'];
  return passport.authenticate(provider, { scope: scopes, state: true })(req, res, next);
}

function oauthCallback(provider) {
  return (req, res, next) => {
    if (!passport._strategy(provider)) return res.redirect('/login?error=oauth-unavailable');
    passport.authenticate(provider, { failureRedirect: '/login?error=oauth-failed' }, async (error, user) => {
      if (error) return next(error);
      if (!user) return res.redirect('/login?error=oauth-failed');
      try {
        await loginSession(req, user);
        res.redirect('/account');
      } catch (loginError) { next(loginError); }
    })(req, res, next);
  };
}

module.exports = { forgotPassword, login, logout, oauthCallback, oauthStart, register, resetPassword };
