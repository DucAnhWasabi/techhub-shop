const notice = document.querySelector('#notice');
let csrfToken;
let currentAddresses = [];

async function request(path, method = 'GET', data) {
  const headers = { Accept: 'application/json' };
  const options = { method, headers, credentials: 'same-origin' };
  if (!['GET', 'HEAD'].includes(method)) {
    csrfToken ||= (await fetch('/api/auth/csrf').then((response) => response.json())).csrfToken;
    headers['X-CSRF-Token'] = csrfToken;
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data || {});
  }
  const response = await fetch(path, options);
  const result = await response.json();
  if (response.status === 401) { window.location.assign('/login'); throw new Error('Vui lòng đăng nhập.'); }
  if (!response.ok) throw new Error(result.error || 'Yêu cầu thất bại.');
  return result;
}

function show(message, error = false) {
  notice.textContent = message;
  notice.className = `alert ${error ? 'alert-danger' : 'alert-success'}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

async function loadAccount() {
  const { data } = await request('/api/me');
  currentAddresses = data.addresses;
  document.querySelector('#profile-summary').innerHTML = `<div>${escapeHtml(data.email)}</div><div>Điểm thưởng: ${Number(data.loyalty_balance).toLocaleString('en-US')}</div>`;
  document.querySelector('#fullName').value = data.full_name;
  document.querySelector('#addresses').innerHTML = data.addresses.length ? data.addresses.map((address) => `
    <article class="address-card">
      <div class="d-flex justify-content-between gap-2"><strong>${escapeHtml(address.recipient_name)}</strong>
        ${address.is_default ? '<span class="badge text-bg-info">Mặc định</span>' : ''}</div>
      <div class="small text-secondary mt-1">${escapeHtml([address.line1,address.line2,address.ward,address.district,address.province,address.postal_code].filter(Boolean).join(', '))}</div>
      ${address.phone ? `<div class="small text-secondary">${escapeHtml(address.phone)}</div>` : ''}
      <div class="d-flex gap-2 mt-2"><button class="btn btn-sm btn-outline-light" data-edit="${address.id}">Sửa</button>${address.is_default ? '' : `<button class="btn btn-sm btn-outline-info" data-default="${address.id}">Đặt mặc định</button>`}
        <button class="btn btn-sm btn-outline-danger" data-delete="${address.id}">Xóa</button></div>
    </article>`).join('') : '<div class="text-secondary">Chưa có địa chỉ giao hàng.</div>';
}

document.querySelector('#profile-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try { await request('/api/me', 'PATCH', { fullName: document.querySelector('#fullName').value }); show('Đã cập nhật hồ sơ.'); await loadAccount(); }
  catch (error) { show(error.message, true); }
});

document.querySelector('#password-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const currentPassword = document.querySelector('#currentPassword').value;
  const newPassword = document.querySelector('#newPassword').value;
  try {
    const result = await request('/api/me/password', 'PATCH', { currentPassword, newPassword });
    event.target.reset(); show(result.message);
  } catch (error) { show(error.message, true); }
});

document.querySelector('#address-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  data.isDefault = form.elements.isDefault.checked;
  const addressId = data.addressId;
  delete data.addressId;
  try {
    await request(addressId ? `/api/me/addresses/${addressId}` : '/api/me/addresses', addressId ? 'PATCH' : 'POST', data);
    form.reset(); form.elements.addressId.value = '';
    document.querySelector('#cancel-address-edit').classList.add('d-none');
    show(addressId ? 'Đã cập nhật địa chỉ.' : 'Đã lưu địa chỉ.');
    await loadAccount();
  }
  catch (error) { show(error.message, true); }
});

document.querySelector('#addresses').addEventListener('click', async (event) => {
  const id = event.target.dataset.default || event.target.dataset.delete || event.target.dataset.edit;
  if (!id) return;
  try {
    if (event.target.dataset.edit) {
      const address = currentAddresses.find((item) => item.id === id);
      if (!address) return;
      const form = document.querySelector('#address-form');
      form.elements.addressId.value = id;
      form.elements.recipientName.value = address.recipient_name;
      form.elements.phone.value = address.phone || '';
      form.elements.line1.value = address.line1;
      form.elements.line2.value = address.line2 || '';
      form.elements.ward.value = address.ward || '';
      form.elements.district.value = address.district || '';
      form.elements.province.value = address.province;
      form.elements.postalCode.value = address.postal_code || '';
      form.elements.isDefault.checked = address.is_default;
      document.querySelector('#cancel-address-edit').classList.remove('d-none');
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (event.target.dataset.default) await request(`/api/me/addresses/${id}/default`, 'PATCH');
    else await request(`/api/me/addresses/${id}`, 'DELETE');
    show(event.target.dataset.default ? 'Đã đổi địa chỉ mặc định.' : 'Đã xóa địa chỉ.');
    await loadAccount();
  } catch (error) { show(error.message, true); }
});

document.querySelector('#cancel-address-edit').addEventListener('click', () => {
  const form = document.querySelector('#address-form');
  form.reset(); form.elements.addressId.value = '';
  document.querySelector('#cancel-address-edit').classList.add('d-none');
});

document.querySelector('#logout').addEventListener('click', async () => {
  try { await request('/api/auth/logout', 'POST'); window.location.assign('/'); }
  catch (error) { show(error.message, true); }
});

loadAccount().catch((error) => show(error.message, true));
