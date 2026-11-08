const db = require('../config/db');
const users = require('../services/users');
const auth = require('../services/auth');

async function profile(req, res) {
  res.json({ data: await users.getProfile(req.user.id) });
}

async function updateProfile(req, res) {
  res.json({ data: await users.updateProfile(req.user.id, req.body.fullName) });
}

async function changePassword(req, res) {
  await auth.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
  res.json({ message: 'Đã đổi mật khẩu.' });
}

async function listAddresses(req, res) {
  const { rows } = await db.query(
    `SELECT id,recipient_name,phone,line1,line2,ward,district,province,postal_code,is_default
     FROM addresses WHERE user_id=$1 ORDER BY is_default DESC,created_at DESC`, [req.user.id]
  );
  res.json({ data: rows });
}

async function addAddress(req, res) {
  res.status(201).json({ data: await users.addAddress(req.user.id, req.body) });
}

async function updateAddress(req, res) {
  const a = users.validateAddress(req.body);
  const { rows } = await db.query(
    `UPDATE addresses SET recipient_name=$3,phone=$4,line1=$5,line2=$6,ward=$7,district=$8,
     province=$9,postal_code=$10,updated_at=NOW()
     WHERE id=$1 AND user_id=$2
     RETURNING id,recipient_name,phone,line1,line2,ward,district,province,postal_code,is_default`,
    [req.params.id,req.user.id,a.recipientName,a.phone,a.line1,a.line2,a.ward,a.district,a.province,a.postalCode]
  );
  if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy địa chỉ.' });
  if (req.body.isDefault === true) await users.setDefaultAddress(req.user.id, req.params.id);
  if (req.body.isDefault === true) rows[0].is_default = true;
  res.json({ data: rows[0] });
}

async function setDefaultAddress(req, res) {
  await users.setDefaultAddress(req.user.id, req.params.id);
  res.json({ message: 'Đã cập nhật địa chỉ mặc định.' });
}

async function deleteAddress(req, res) {
  await users.deleteAddress(req.user.id, req.params.id);
  res.json({ message: 'Đã xóa địa chỉ.' });
}

module.exports = { addAddress, changePassword, deleteAddress, listAddresses, profile, setDefaultAddress, updateAddress, updateProfile };
