const crypto = require('crypto');
const db = require('../config/db');
const { sendOrderConfirmation } = require('./mailer');

function config() {
  if (!process.env.VNPAY_TMN_CODE || !process.env.VNPAY_HASH_SECRET || !process.env.VNPAY_URL || !process.env.VNPAY_RETURN_URL) {
    throw Object.assign(new Error('VNPay chưa được cấu hình.'), { status: 503 });
  }
  return { tmnCode: process.env.VNPAY_TMN_CODE, secret: process.env.VNPAY_HASH_SECRET, url: process.env.VNPAY_URL, returnUrl: process.env.VNPAY_RETURN_URL };
}
function canonical(params) {
  return Object.keys(params).filter((key) => key.startsWith('vnp_') && key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType')
    .sort().map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`).join('&');
}
function signature(params, secret) { return crypto.createHmac('sha512', secret).update(canonical(params), 'utf8').digest('hex'); }
function valid(params) {
  const { secret } = config();
  const given = String(params.vnp_SecureHash || '').toLowerCase();
  const expected = signature(params, secret);
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
function createPaymentUrl(order, ip) {
  const cfg = config();
  const now = new Date();
  const stamp = (date) => { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(date).reduce((out, part) => (out[part.type] = part.value, out), {}); return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`; };
  const params = {
    vnp_Version: '2.1.0', vnp_Command: 'pay', vnp_TmnCode: cfg.tmnCode,
    vnp_Amount: String(Number(order.total_vnd) * 100), vnp_CurrCode: 'VND',
    vnp_TxnRef: order.order_number, vnp_OrderInfo: `Thanh toan don hang ${order.order_number}`,
    vnp_OrderType: 'other', vnp_Locale: 'vn', vnp_ReturnUrl: cfg.returnUrl,
    vnp_IpAddr: String(ip || '127.0.0.1').replace(/^::ffff:/, '').slice(0, 45),
    vnp_CreateDate: stamp(now), vnp_ExpireDate: stamp(new Date(now.getTime() + 15 * 60 * 1000))
  };
  params.vnp_SecureHash = signature(params, cfg.secret);
  return `${cfg.url}?${Object.keys(params).sort().map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&')}`;
}
async function processResult(params) {
  if (!valid(params)) return { ok: false, code: '97' };
  const client = await db.connect();
  let order, alreadyPaid = false;
  try {
    await client.query('BEGIN');
    const result = await client.query('SELECT * FROM orders WHERE order_number=$1 FOR UPDATE', [params.vnp_TxnRef]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return { ok: false, code: '_order_not_found' }; }
    order = result.rows[0];
    if (String(Number(order.total_vnd) * 100) !== String(params.vnp_Amount)) { await client.query('ROLLBACK'); return { ok: false, code: '金额不匹配' }; }
    alreadyPaid = order.payment_status === 'paid';
    if (!alreadyPaid && params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00') {
      await client.query("UPDATE orders SET payment_status='paid',payment_reference=$2,status='confirmed',updated_at=NOW() WHERE id=$1", [order.id, params.vnp_TransactionNo]);
      await client.query("INSERT INTO order_status_history(order_id,status,note) VALUES($1,'confirmed','VNPay sandbox payment successful.')", [order.id]);
    } else if (!alreadyPaid && params.vnp_ResponseCode !== '00') {
      await client.query("UPDATE orders SET payment_status='failed',updated_at=NOW() WHERE id=$1 AND payment_status='unpaid'", [order.id]);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  if (!alreadyPaid && params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00') {
    const { rows: items } = await db.query('SELECT product_name_snapshot AS product_name,variant_name_snapshot AS variant_name,quantity,line_total_vnd FROM order_items WHERE order_id=$1 ORDER BY id', [order.id]);
    try { await sendOrderConfirmation({ ...order, items }); } catch (error) { console.error('Could not send VNPay order email:', error.message); }
  }
  return { ok: alreadyPaid || params.vnp_ResponseCode === '00', code: alreadyPaid ? '00' : params.vnp_ResponseCode };
}
module.exports = { createPaymentUrl, processResult };

