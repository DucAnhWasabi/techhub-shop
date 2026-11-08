const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { normalizeEmail, validEmail } = require('./validation');
const { sendPasswordReset } = require('./mailer');

async function authenticate(email, password) {
  const normalized = normalizeEmail(email);
  if (!validEmail(normalized) || typeof password !== 'string') return null;
  const { rows } = await db.query(
    'SELECT id,email,full_name,password_hash,role,is_banned,loyalty_balance FROM users WHERE email=$1', [normalized]
  );
  if (!rows.length || rows[0].is_banned || !rows[0].password_hash) return null;
  if (!await bcrypt.compare(password, rows[0].password_hash)) return null;
  const { password_hash, ...user } = rows[0];
  return user;
}

async function changePassword(userId, currentPassword, newPassword) {
  if (typeof newPassword !== 'string' || newPassword.length < 10 || newPassword.length > 128) {
    throw Object.assign(new Error('Mật khẩu mới cần từ 10 đến 128 ký tự.'), { status: 400 });
  }
  const { rows } = await db.query('SELECT password_hash FROM users WHERE id=$1', [userId]);
  if (!rows.length) throw Object.assign(new Error('Không tìm thấy tài khoản.'), { status: 404 });
  if (!rows[0].password_hash || typeof currentPassword !== 'string' ||
      !await bcrypt.compare(currentPassword, rows[0].password_hash)) {
    throw Object.assign(new Error('Mật khẩu hiện tại không chính xác.'), { status: 400 });
  }
  const hash = await bcrypt.hash(newPassword, 12);
  await db.query('UPDATE users SET password_hash=$2,updated_at=NOW() WHERE id=$1', [userId, hash]);
  await db.query('UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL', [userId]);
}

async function requestPasswordReset(email) {
  const normalized = normalizeEmail(email);
  if (!validEmail(normalized)) return;
  const { rows } = await db.query('SELECT id,email FROM users WHERE email=$1 AND is_banned=FALSE', [normalized]);
  if (!rows.length) return;
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await db.query('DELETE FROM password_reset_tokens WHERE user_id=$1 AND used_at IS NULL', [rows[0].id]);
  await db.query(
    `INSERT INTO password_reset_tokens(user_id,token_hash,expires_at)
     VALUES($1,$2,NOW() + INTERVAL '30 minutes')`, [rows[0].id, tokenHash]
  );
  await sendPasswordReset(rows[0].email, rawToken);
}

async function resetPassword(token, newPassword) {
  if (typeof token !== 'string' || token.length < 30 || token.length > 100) {
    throw Object.assign(new Error('Liên kết khôi phục không hợp lệ hoặc đã hết hạn.'), { status: 400 });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 10 || newPassword.length > 128) {
    throw Object.assign(new Error('Mật khẩu mới cần từ 10 đến 128 ký tự.'), { status: 400 });
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      `SELECT id,user_id FROM password_reset_tokens
       WHERE token_hash=$1 AND used_at IS NULL AND expires_at>NOW() FOR UPDATE`, [tokenHash]
    );
    if (!found.rowCount) throw Object.assign(new Error('Liên kết khôi phục không hợp lệ hoặc đã hết hạn.'), { status: 400 });
    const hash = await bcrypt.hash(newPassword, 12);
    await client.query('UPDATE users SET password_hash=$2,updated_at=NOW() WHERE id=$1', [found.rows[0].user_id, hash]);
    await client.query('UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL', [found.rows[0].user_id]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

module.exports = { authenticate, changePassword, requestPasswordReset, resetPassword };
