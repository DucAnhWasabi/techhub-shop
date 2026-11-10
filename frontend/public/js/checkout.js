let csrfToken;
let currentStep = 1;
let profile = null;
let savedAddresses = [];
let checkoutData = null;
let quote = null;
const money = (value) => `${Number(value).toLocaleString('en-US')}đ`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const notice = document.querySelector('#checkout-notice');
const form = document.querySelector('#checkout-form');

async function api(path, method = 'GET', body) {
  const headers = { Accept: 'application/json' };
  const options = { method, credentials: 'same-origin', headers };
  if (method !== 'GET') {
    csrfToken ||= (await fetch('/api/auth/csrf').then((response) => response.json())).csrfToken;
    headers['Content-Type'] = 'application/json'; headers['X-CSRF-Token'] = csrfToken;
    options.body = JSON.stringify(body || {});
  }
  const response = await fetch(path, options); const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Không thể hoàn tất yêu cầu.');
  return result.data;
}

function show(message, isError = true) { notice.textContent = message; notice.className = `alert ${isError ? 'alert-danger' : 'alert-success'}`; }
function showStep(step) {
  currentStep = step;
  document.querySelectorAll('.checkout-step').forEach((section) => section.classList.toggle('d-none', Number(section.dataset.step) !== step));
  document.querySelectorAll('[data-step-indicator]').forEach((item) => item.classList.toggle('active', Number(item.dataset.stepIndicator) <= step));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function addressFields() {
  return Object.fromEntries(['recipientName','phone','line1','line2','ward','district','province','postalCode'].map((id) => [id, document.querySelector(`#${id}`).value.trim()]));
}

function setAddressFields(address) {
  for (const [id, key] of Object.entries({ recipientName:'recipient_name', phone:'phone', line1:'line1', line2:'line2', ward:'ward', district:'district', province:'province', postalCode:'postal_code' })) {
    document.querySelector(`#${id}`).value = address[key] || '';
  }
}

function toggleAddressFields(enabled) {
  document.querySelectorAll('#address-fields input').forEach((input) => { input.disabled = !enabled; input.required = enabled && ['recipientName','phone','line1','province'].includes(input.id); });
}

async function loadProfile() {
  const response = await fetch('/api/me');
  if (!response.ok) return;
  profile = (await response.json()).data;
  savedAddresses = profile.addresses;
  document.querySelector('#guest-contact').classList.add('d-none');
  document.querySelector('#email').required = false;
  document.querySelector('#fullName').required = false;
  const selector = document.querySelector('#address-select');
  selector.innerHTML = '<option value="custom">Nhập địa chỉ khác</option>' + savedAddresses.map((address) => `<option value="${address.id}" ${address.is_default ? 'selected' : ''}>${escapeHtml(address.recipient_name)} — ${escapeHtml([address.line1,address.district,address.province].filter(Boolean).join(', '))}${address.is_default ? ' (mặc định)' : ''}</option>`).join('');
  if (savedAddresses.length) {
    document.querySelector('#saved-address-section').classList.remove('d-none');
    const selected = savedAddresses.find((address) => address.is_default) || savedAddresses[0];
    selector.value = selected.id; setAddressFields(selected); toggleAddressFields(false);
  }
}

function selectedCheckoutData() {
  if (profile) {
    const selectedId = document.querySelector('#address-select').value;
    if (selectedId && selectedId !== 'custom') return { addressId: selectedId, email: profile.email, fullName: profile.full_name };
    return { address: addressFields(), email: profile.email, fullName: profile.full_name };
  }
  return { email: document.querySelector('#email').value.trim(), fullName: document.querySelector('#fullName').value.trim(), address: addressFields() };
}

function renderQuote(data) {
  quote = data;
  document.querySelector('#available-points').textContent = data.pointsAvailable ? `(có ${data.pointsAvailable})` : '(0)';
  document.querySelector('#pointsToRedeem').max = data.pointsAvailable;
  const lines = data.items.map((item) => `<div class="summary-line small"><span>${escapeHtml(item.productName)} · ${escapeHtml(item.variantName)} × ${item.quantity}</span><strong>${money(item.lineTotalVnd)}</strong></div>`).join('');
  document.querySelector('#quote-summary').innerHTML = `${lines}<hr class="border-secondary"><div class="summary-line"><span>Tạm tính</span><strong>${money(data.subtotalVnd)}</strong></div>
    ${data.coupon ? `<div class="summary-line text-success"><span>Mã ${escapeHtml(data.coupon.code)} (${data.coupon.value}${data.coupon.type === 'percent' ? '%' : 'đ'})</span><strong>−${money(data.discountVnd)}</strong></div>` : ''}
    <div class="summary-line"><span>Thuế (10%)</span><strong>${money(data.taxVnd)}</strong></div><div class="summary-line"><span>Giao hàng</span><strong>${data.shippingFeeVnd ? money(data.shippingFeeVnd) : 'Miễn phí'}</strong></div>
    ${data.loyaltyRedeemedVnd ? `<div class="summary-line text-success"><span>Dùng ${data.pointsRedeemed} điểm</span><strong>−${money(data.loyaltyRedeemedVnd)}</strong></div>` : ''}
    <div class="summary-line total-line mt-2"><span>Tổng COD</span><strong>${money(data.totalVnd)}</strong></div><div class="small text-secondary mt-2">Bạn nhận ${data.earnedPoints} điểm sau đơn hàng.</div>`;
}

async function getQuote() {
  const code = document.querySelector('#discountCode').value.trim().toUpperCase();
  const pointsToRedeem = Number(document.querySelector('#pointsToRedeem').value || 0);
  try { renderQuote(await api('/api/checkout/quote', 'POST', { discountCode: code, pointsToRedeem })); return true; }
  catch (error) { show(error.message); return false; }
}

function renderOrderReview() {
  const address = checkoutData.address || savedAddresses.find((item) => item.id === checkoutData.addressId);
  const addressText = address ? [address.line1,address.line2,address.ward,address.district,address.province,address.postalCode || address.postal_code].filter(Boolean).join(', ') : '';
  document.querySelector('#order-review').innerHTML = `<div class="address-card mb-3"><strong>${escapeHtml(address?.recipientName || address?.recipient_name)}</strong><div class="small text-secondary">${escapeHtml(addressText)}</div><div class="small text-secondary">${escapeHtml(checkoutData.email)}</div></div>${document.querySelector('#quote-summary').innerHTML}`;
}

document.querySelector('#address-select').addEventListener('change', (event) => {
  const address = savedAddresses.find((item) => item.id === event.target.value);
  if (address) { setAddressFields(address); toggleAddressFields(false); }
  else toggleAddressFields(true);
});

document.querySelector('#step-1-next').addEventListener('click', () => {
  if (!profile && !['email','fullName'].every((id) => document.querySelector(`#${id}`).reportValidity())) return;
  const selected = profile && document.querySelector('#address-select').value;
  if (!profile || !selected || selected === 'custom') {
    const enabledFields = [...document.querySelectorAll('#address-fields input')].filter((input) => !input.disabled);
    if (!enabledFields.every((input) => input.reportValidity())) return;
  }
  checkoutData = selectedCheckoutData();
  showStep(2); getQuote();
});

document.querySelector('#apply-coupon').addEventListener('click', getQuote);
document.querySelector('#step-2-next').addEventListener('click', async () => {
  if (await getQuote()) { renderOrderReview(); showStep(3); }
});
document.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.back))));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.querySelector('#place-order'); button.disabled = true; button.textContent = 'Đang tạo đơn…';
  try {
    const payload = { ...checkoutData, discountCode: document.querySelector('#discountCode').value.trim().toUpperCase(), pointsToRedeem: Number(document.querySelector('#pointsToRedeem').value || 0) };
    const result = await api('/api/checkout/place-order', 'POST', payload);
    form.classList.add('d-none'); document.querySelector('.checkout-steps').classList.add('d-none');
    document.querySelector('#checkout-done').classList.remove('d-none');
    document.querySelector('#checkout-done').innerHTML = `<div class="eyebrow">ORDER RECEIVED</div><h2 class="h3 mt-2">Cảm ơn bạn đã đặt hàng!</h2><p>Mã đơn: <strong>${escapeHtml(result.order_number)}</strong></p><p>Tổng thanh toán khi nhận hàng: <strong>${money(result.total_vnd)}</strong></p><p class="text-secondary">${result.emailSent ? 'Email xác nhận đã được gửi.' : 'Đơn đã lưu. Email xác nhận sẽ được gửi khi cửa hàng cấu hình SMTP.'}</p>${profile ? `<a class="btn btn-info" href="/orders/${result.id}">Xem chi tiết đơn</a>` : '<a class="btn btn-info" href="/">Về cửa hàng</a><p class="small text-secondary mt-3">Tạo mật khẩu qua Quên mật khẩu bằng email này để xem đơn trong lịch sử sau này.</p>'}`;
  } catch (error) { show(error.message); button.disabled = false; button.textContent = 'Đặt hàng'; }
});

loadProfile().catch(() => {}).finally(() => {
  if (profile) document.querySelector('#pointsToRedeem').disabled = false;
  else document.querySelector('#pointsToRedeem').disabled = true;
  toggleAddressFields(true);
  if (profile && savedAddresses.length) {
    const selected = savedAddresses.find((address) => address.is_default) || savedAddresses[0];
    setAddressFields(selected); toggleAddressFields(false);
  }
});
