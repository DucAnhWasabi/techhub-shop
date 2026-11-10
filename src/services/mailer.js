const nodemailer = require('nodemailer');

function createTransport() {
  if (!process.env.SMTP_HOST) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    } : undefined
  });
}

async function sendPasswordReset(email, token) {
  const baseUrl = (process.env.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const transport = createTransport();
  if (!transport) {
    // Chỉ hỗ trợ kiểm tra local; production không ghi token vào log.
    if (process.env.NODE_ENV !== 'production') console.info(`Link khôi phục mật khẩu cho ${email}: ${resetUrl}`);
    return;
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM || 'TechHub <no-reply@techhub.local>',
    to: email,
    subject: 'Khôi phục mật khẩu TechHub',
    text: `Mở liên kết sau để đặt mật khẩu mới (có hiệu lực 30 phút): ${resetUrl}`,
    html: `<p>Yêu cầu đặt lại mật khẩu TechHub đã được gửi.</p><p><a href="${resetUrl}">Đặt mật khẩu mới</a></p><p>Liên kết có hiệu lực trong 30 phút.</p>`
  });
}

async function sendOrderConfirmation(order) {
  const transport = createTransport();
  if (!transport) {
    if (process.env.NODE_ENV !== 'production') console.info(`Đơn ${order.order_number} đã tạo cho ${order.email}; SMTP chưa cấu hình nên chưa gửi email.`);
    return false;
  }
  const lines = order.items.map((item) => `${item.product_name} — ${item.variant_name} × ${item.quantity}: ${Number(item.line_total_vnd).toLocaleString('en-US')}đ`);
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  await transport.sendMail({
    from: process.env.SMTP_FROM || 'TechHub <no-reply@techhub.local>',
    to: order.email,
    subject: `TechHub xác nhận đơn hàng ${order.order_number}`,
    text: `Cảm ơn bạn đã đặt hàng.\nMã đơn: ${order.order_number}\n${lines.join('\n')}\nTổng thanh toán COD: ${Number(order.total_vnd).toLocaleString('en-US')}đ`,
    html: `<h2>TechHub đã nhận đơn hàng</h2><p>Mã đơn: <strong>${escapeHtml(order.order_number)}</strong></p><ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul><p>Tổng thanh toán COD: <strong>${Number(order.total_vnd).toLocaleString('en-US')}đ</strong></p>`
  });
  return true;
}

module.exports = { sendOrderConfirmation, sendPasswordReset };
