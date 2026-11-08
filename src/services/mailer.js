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

async function sendOrderConfirmation() {
  // Sẽ được dùng khi luồng checkout được triển khai ở giai đoạn sau.
}

module.exports = { sendOrderConfirmation, sendPasswordReset };
