let csrfToken;
const money = (value) => `${Number(value).toLocaleString('en-US')}đ`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

async function request(path, method = 'GET', body) {
  const headers = { Accept: 'application/json' };
  const options = { method, credentials: 'same-origin', headers };
  if (method !== 'GET') {
    csrfToken ||= (await fetch('/api/auth/csrf').then((response) => response.json())).csrfToken;
    headers['X-CSRF-Token'] = csrfToken;
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body || {});
  }
  const response = await fetch(path, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Không thể cập nhật giỏ hàng.');
  return result.data;
}

function totalsMarkup(data) {
  return `<div class="summary-line"><span>Tạm tính</span><strong>${money(data.subtotalVnd)}</strong></div>
    <div class="summary-line"><span>Thuế (10%)</span><strong>${money(data.taxVnd)}</strong></div>
    <div class="summary-line"><span>Phí giao hàng</span><strong>${data.shippingFeeVnd ? money(data.shippingFeeVnd) : 'Miễn phí'}</strong></div>
    <hr class="border-secondary"><div class="summary-line total-line"><span>Tổng dự kiến</span><strong>${money(data.totalVnd)}</strong></div><p class="small text-secondary mt-2 mb-0">Phí giao hàng 30,000đ; miễn phí từ 1,000,000đ.</p>`;
}

function render(data) {
  const target = document.querySelector('#cart-items');
  document.querySelector('#cart-totals').innerHTML = totalsMarkup(data);
  if (!data.items.length) {
    target.innerHTML = '<div class="empty-state">Giỏ hàng đang trống. <a href="/products">Khám phá sản phẩm máy tính và linh kiện.</a></div>';
    document.querySelector('#checkout-link').classList.add('disabled');
    return;
  }
  document.querySelector('#checkout-link').classList.remove('disabled');
  target.innerHTML = data.items.map((item) => `
    <article class="cart-item"><a href="/products/${encodeURIComponent(item.slug)}" class="cart-thumb">${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.product_name)}">` : escapeHtml(item.product_name)}</a>
      <div class="cart-item-info"><div class="product-brand">${escapeHtml(item.sku)}</div><h2 class="h6 mt-1">${escapeHtml(item.product_name)}</h2><div class="small text-secondary">${escapeHtml(item.variant_name)} · ${money(item.price_vnd)} / sản phẩm</div><div class="small ${item.stock_quantity < 5 ? 'text-warning' : 'text-secondary'}">Còn ${Number(item.stock_quantity)} trong kho</div></div>
      <div class="cart-controls"><div class="input-group input-group-sm"><button class="btn btn-outline-light" data-change="-1" data-id="${item.cart_item_id}" aria-label="Giảm số lượng">−</button><input class="form-control text-center" value="${Number(item.quantity)}" data-quantity="${item.cart_item_id}" aria-label="Số lượng"><button class="btn btn-outline-light" data-change="1" data-id="${item.cart_item_id}" aria-label="Tăng số lượng">+</button></div><strong class="d-block text-end mt-2">${money(item.line_total_vnd)}</strong><button class="btn btn-link btn-sm text-danger p-0 mt-1" data-remove="${item.cart_item_id}">Xóa</button></div>
    </article>`).join('');
}

async function load() {
  try { render(await request('/api/cart')); }
  catch (error) { const box = document.querySelector('#cart-error'); box.textContent = error.message; box.classList.remove('d-none'); }
}

document.querySelector('#cart-items').addEventListener('click', async (event) => {
  const change = event.target.dataset.change;
  const remove = event.target.dataset.remove;
  try {
    if (change) {
      const input = document.querySelector(`[data-quantity="${event.target.dataset.id}"]`);
      const quantity = Math.max(0, Number(input.value) + Number(change));
      render(await request(`/api/cart/items/${event.target.dataset.id}`, 'PATCH', { quantity }));
    } else if (remove) render(await request(`/api/cart/items/${remove}`, 'DELETE'));
  } catch (error) { const box = document.querySelector('#cart-error'); box.textContent = error.message; box.classList.remove('d-none'); }
});

document.querySelector('#cart-items').addEventListener('change', async (event) => {
  const id = event.target.dataset.quantity;
  if (!id) return;
  try { render(await request(`/api/cart/items/${id}`, 'PATCH', { quantity: Number(event.target.value) })); }
  catch (error) { const box = document.querySelector('#cart-error'); box.textContent = error.message; box.classList.remove('d-none'); await load(); }
});

load();
