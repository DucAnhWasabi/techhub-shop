function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function validEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, maxLength) : '';
}

function validateIdentity({ email, fullName, address }) {
  const normalizedEmail = normalizeEmail(email);
  const name = cleanText(fullName, 100);
  const shippingAddress = cleanText(address, 300);
  if (!validEmail(normalizedEmail)) return { error: 'Vui lòng nhập email hợp lệ.' };
  if (name.length < 2) return { error: 'Họ tên cần có ít nhất 2 ký tự.' };
  if (shippingAddress.length < 5) return { error: 'Địa chỉ giao hàng cần có ít nhất 5 ký tự.' };
  return { value: { email: normalizedEmail, fullName: name, address: shippingAddress } };
}

module.exports = { cleanText, normalizeEmail, validEmail, validateIdentity };
