const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const FacebookStrategy = require('passport-facebook').Strategy;
const db = require('./db');

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await db.query(
      'SELECT id,email,full_name,role,is_banned,loyalty_balance FROM users WHERE id=$1', [id]
    );
    done(null, rows[0] || false);
  } catch (error) { done(error); }
});

async function findOrCreateOAuthUser(provider, profile) {
  const email = profile.emails?.[0]?.value?.trim().toLowerCase();
  if (!email) throw new Error('Nhà cung cấp không trả về email; không thể tạo tài khoản TechHub.');
  const providerId = String(profile.id);
  const displayName = (profile.displayName || email.split('@')[0]).trim().slice(0, 100);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const linked = await client.query(
      `SELECT u.id,u.email,u.full_name,u.role,u.is_banned,u.loyalty_balance
       FROM oauth_accounts oa JOIN users u ON u.id=oa.user_id
       WHERE oa.provider=$1 AND oa.provider_user_id=$2 FOR UPDATE`, [provider, providerId]
    );
    if (linked.rowCount) {
      if (linked.rows[0].is_banned) throw new Error('Tài khoản đã bị khóa.');
      await client.query('COMMIT');
      return linked.rows[0];
    }

    const account = await client.query(
      `INSERT INTO users(email,full_name,role) VALUES($1,$2,'customer')
       ON CONFLICT(email) DO UPDATE SET email=EXCLUDED.email
       RETURNING id,email,full_name,role,is_banned,loyalty_balance`, [email, displayName]
    );
    const user = account.rows[0];
    if (user.is_banned) throw new Error('Tài khoản đã bị khóa.');
    if (user.role !== 'customer') throw new Error('Đăng nhập mạng xã hội chỉ dành cho customer.');
    await client.query(
      `INSERT INTO oauth_accounts(user_id,provider,provider_user_id) VALUES($1,$2,$3)
       ON CONFLICT(provider,provider_user_id) DO NOTHING`, [user.id, provider, providerId]
    );
    const confirm = await client.query(
      `SELECT u.id,u.email,u.full_name,u.role,u.is_banned,u.loyalty_balance
       FROM oauth_accounts oa JOIN users u ON u.id=oa.user_id
       WHERE oa.provider=$1 AND oa.provider_user_id=$2`, [provider, providerId]
    );
    if (confirm.rows[0].is_banned) throw new Error('Tài khoản đã bị khóa.');
    await client.query('COMMIT');
    return confirm.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

const baseUrl = (process.env.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use('google', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${baseUrl}/api/auth/google/callback`,
    passReqToCallback: false
  }, (_accessToken, _refreshToken, profile, done) => {
    findOrCreateOAuthUser('google', profile).then((user) => done(null, user)).catch(done);
  }));
}

if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use('facebook', new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: `${baseUrl}/api/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'emails']
  }, (_accessToken, _refreshToken, profile, done) => {
    findOrCreateOAuthUser('facebook', profile).then((user) => done(null, user)).catch(done);
  }));
}

module.exports = passport;
