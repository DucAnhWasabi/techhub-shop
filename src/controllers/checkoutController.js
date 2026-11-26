const checkout = require('../services/checkoutService');
const vnpay = require('../services/vnpay');

async function quote(req, res) {
  res.json({ data: await checkout.quote(req, res, req.body) });
}

async function placeOrder(req, res) {
  const result = await checkout.placeOrder(req, res, req.body);
  if (req.body.paymentMethod === 'vnpay') {
    result.paymentUrl = vnpay.createPaymentUrl(result, req.ip);
    return res.status(201).json({ data: result });
  }
  res.status(201).json({ data: result });
}

async function vnpayReturn(req, res) {
  try {
    const result = await vnpay.processResult(req.query);
    return res.redirect(`${(process.env.BASE_URL || '').replace(/\/$/, '')}/checkout?payment=${result.ok ? 'success' : 'failed'}`);
  } catch (error) { return res.redirect(`${(process.env.BASE_URL || '').replace(/\/$/, '')}/checkout?payment=failed`); }
}

async function vnpayIpn(req, res) {
  const result = await vnpay.processResult(req.query);
  res.json({ RspCode: result.ok ? '00' : result.code === '_order_not_found' ? '01' : result.code === '金额不匹配' ? '04' : '97', Message: result.ok ? 'Confirm Success' : 'Invalid signature or payment' });
}

module.exports = { placeOrder, quote, vnpayReturn, vnpayIpn };
