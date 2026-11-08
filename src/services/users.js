const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { cleanText, normalizeEmail, validateIdentity } = require('./validation');

async function registerWithPassword(input) {
  const { email, fullName, address, password } = input || {};
  const allowed = new Set(['email', 'fullName', 'address', 'password']);
  if (!input || typeof input !== 'object' || Object.keys(input).some((key) => !allowed.has(key))) {
    throw Object.assign(new Error('Biểu mẫu đăng ký chỉ nhận email, họ tên, địa chỉ và mật khẩu.'), { status: 400 });
  }
  const validated = validateIdentity({ email, fullName, address });
  if (validated.error) throw Object.assign(new Error(validated.error), { status: 400 });
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    throw Object.assign(new Error('Mật khẩu cần từ 10 đến 128 ký tự.'), { status: 400 });
  }
  const hash = await bcrypt.hash(password, 12);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO users(email,full_name,password_hash,role) VALUES($1,$2,$3,'customer')
       RETURNING id,email,full_name,role,loyalty_balance,created_at`,
      [validated.value.email, validated.value.fullName, hash]
    );
    await client.query(
      `INSERT INTO addresses(user_id,recipient_name,line1,province,is_default)
       VALUES($1,$2,$3,'Chưa cập nhật',TRUE)`,
      [result.rows[0].id, validated.value.fullName, validated.value.address]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') throw Object.assign(new Error('Email này đã được đăng ký.'), { status: 409 });
    throw error;
  } finally { client.release(); }
}

// Gọi trong transaction checkout để liên kết đơn guest với customer theo email.
async function ensureGuestCustomer(client, { email, fullName, address }) {
  const validated = validateIdentity({ email, fullName, address });
  if (validated.error) throw Object.assign(new Error(validated.error), { status: 400 });
  const inserted = await client.query(
    `INSERT INTO users(email,full_name,role) VALUES($1,$2,'customer')
     ON CONFLICT(email) DO NOTHING RETURNING id,email,full_name,role`,
    [validated.value.email, validated.value.fullName]
  );
  if (inserted.rowCount) {
    await client.query(
      `INSERT INTO addresses(user_id,recipient_name,line1,province,is_default)
       VALUES($1,$2,$3,'Chưa cập nhật',TRUE)`,
      [inserted.rows[0].id, validated.value.fullName, validated.value.address]
    );
    return inserted.rows[0];
  }
  const existing = await client.query(
    'SELECT id,email,full_name,role FROM users WHERE email=$1 FOR UPDATE', [validated.value.email]
  );
  if (!existing.rowCount) throw new Error('Không thể tạo hoặc tìm tài khoản khách.');
  return existing.rows[0];
}

async function getProfile(userId) {
  const [user, addresses] = await Promise.all([
    db.query('SELECT id,email,full_name,role,loyalty_balance,created_at FROM users WHERE id=$1 AND is_banned=FALSE', [userId]),
    db.query('SELECT id,recipient_name,phone,line1,line2,ward,district,province,postal_code,is_default FROM addresses WHERE user_id=$1 ORDER BY is_default DESC,created_at DESC', [userId])
  ]);
  if (!user.rowCount) throw Object.assign(new Error('Không tìm thấy tài khoản.'), { status: 404 });
  return { ...user.rows[0], addresses: addresses.rows };
}

async function updateProfile(userId, fullName) {
  const name = cleanText(fullName, 100);
  if (name.length < 2) throw Object.assign(new Error('Họ tên cần có ít nhất 2 ký tự.'), { status: 400 });
  const { rows } = await db.query(
    'UPDATE users SET full_name=$2,updated_at=NOW() WHERE id=$1 AND is_banned=FALSE RETURNING id,email,full_name,role,loyalty_balance,created_at',
    [userId, name]
  );
  if (!rows.length) throw Object.assign(new Error('Không tìm thấy tài khoản.'), { status: 404 });
  return rows[0];
}

function validateAddress(input) {
  const address = {
    recipientName: cleanText(input.recipientName, 100), phone: cleanText(input.phone, 30),
    line1: cleanText(input.line1, 200), line2: cleanText(input.line2, 200),
    ward: cleanText(input.ward, 100), district: cleanText(input.district, 100),
    province: cleanText(input.province, 100), postalCode: cleanText(input.postalCode, 20)
  };
  if (address.recipientName.length < 2 || address.line1.length < 5 || address.province.length < 2) {
    throw Object.assign(new Error('Vui lòng nhập tên người nhận, địa chỉ và tỉnh/thành hợp lệ.'), { status: 400 });
  }
  if (address.phone && !/^[+\d() .-]{8,30}$/.test(address.phone)) {
    throw Object.assign(new Error('Số điện thoại không hợp lệ.'), { status: 400 });
  }
  return address;
}

async function addAddress(userId, input) {
  const a = validateAddress(input);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
    const count = await client.query('SELECT COUNT(*)::int AS count FROM addresses WHERE user_id=$1', [userId]);
    const makeDefault = Boolean(input.isDefault) || count.rows[0].count === 0;
    if (makeDefault) await client.query('UPDATE addresses SET is_default=FALSE WHERE user_id=$1', [userId]);
    const { rows } = await client.query(
      `INSERT INTO addresses(user_id,recipient_name,phone,line1,line2,ward,district,province,postal_code,is_default)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id,recipient_name,phone,line1,line2,ward,district,province,postal_code,is_default`,
      [userId,a.recipientName,a.phone,a.line1,a.line2,a.ward,a.district,a.province,a.postalCode,makeDefault]
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function setDefaultAddress(userId, addressId) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
    const owned = await client.query('SELECT id FROM addresses WHERE id=$1 AND user_id=$2 FOR UPDATE', [addressId,userId]);
    if (!owned.rowCount) throw Object.assign(new Error('Không tìm thấy địa chỉ.'), { status: 404 });
    await client.query('UPDATE addresses SET is_default=FALSE WHERE user_id=$1', [userId]);
    await client.query('UPDATE addresses SET is_default=TRUE,updated_at=NOW() WHERE id=$1', [addressId]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function deleteAddress(userId, addressId) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
    const deleted = await client.query('DELETE FROM addresses WHERE id=$1 AND user_id=$2 RETURNING is_default', [addressId,userId]);
    if (!deleted.rowCount) throw Object.assign(new Error('Không tìm thấy địa chỉ.'), { status: 404 });
    if (deleted.rows[0].is_default) {
      await client.query(
        `UPDATE addresses SET is_default=TRUE WHERE id=(SELECT id FROM addresses WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1)`,
        [userId]
      );
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

module.exports = { addAddress, deleteAddress, ensureGuestCustomer, getProfile, normalizeEmail, registerWithPassword, setDefaultAddress, updateProfile, validateAddress };
