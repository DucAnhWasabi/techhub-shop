const notice = document.querySelector('#admin-notice');
const money = (n) => `${Number(n || 0).toLocaleString('en-US')}đ`;
const dateTime = (value) => new Date(value).toLocaleString('vi-VN');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const statusLabels = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', processing: 'Đang xử lý', shipped: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy' };
const statuses = Object.keys(statusLabels);
let csrfToken;
let currentProducts = [];
let currentUsers = [];
let dashboardChart;
let analyticsChart;
let productPage = 1;
let userPage = 1;
let orderPage = 1;
let orderRange = '';
let productQuery = '';
let userQuery = '';

function show(message, error = false) {
  notice.textContent = message;
  notice.className = `alert ${error ? 'alert-danger' : 'alert-success'}`;
  notice.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

async function request(path, method = 'GET', data) {
  const headers = { Accept: 'application/json' };
  const options = { method, headers, credentials: 'same-origin' };
  if (!['GET', 'HEAD'].includes(method)) {
    csrfToken ||= (await fetch('/api/auth/csrf').then((r) => r.json())).csrfToken;
    headers['X-CSRF-Token'] = csrfToken;
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data || {});
  }
  const response = await fetch(path, options);
  const result = await response.json().catch(() => ({}));
  if (response.status === 401) { window.location.assign('/login'); throw new Error('Cần đăng nhập tài khoản admin.'); }
  if (response.status === 403) { window.location.assign('/'); throw new Error('Tài khoản hiện tại không có quyền admin.'); }
  if (!response.ok) throw new Error(result.error || 'Yêu cầu thất bại.');
  return result;
}

function pager(targetId, result, onPage) {
  const target = document.querySelector(`#${targetId}`);
  target.innerHTML = Array.from({ length: result.totalPages }, (_, i) => `<button class="page-button ${i + 1 === result.page ? 'active' : ''}" data-page="${i + 1}">${i + 1}</button>`).join('');
  target.onclick = (event) => { const page = Number(event.target.dataset.page); if (page) onPage(page); };
}

async function loadDashboard() {
  const { data } = await request('/api/admin/dashboard');
  document.querySelector('#summary-cards').innerHTML = [
    ['Tổng customer', data.total_users], ['Customer mới tháng này', data.new_users], ['Tổng đơn hàng', data.total_orders], ['Doanh thu không gồm đơn hủy', money(data.revenue)]
  ].map(([label, value]) => `<div class="col-6 col-xl-3"><article class="admin-stat"><div>${esc(label)}</div><strong>${esc(value)}</strong></article></div>`).join('');
  dashboardChart?.destroy();
  dashboardChart = new Chart(document.querySelector('#best-chart'), {
    type: 'bar', data: { labels: data.bestSellers.map((x) => x.name), datasets: [{ label: 'Sản phẩm bán ra', data: data.bestSellers.map((x) => x.quantity), backgroundColor: '#3dd6c6' }] },
    options: { indexAxis: 'y', responsive: true, plugins: { legend: { labels: { color: '#e8edf5' } } }, scales: { x: { ticks: { color: '#a2adc0' }, grid: { color: '#293446' } }, y: { ticks: { color: '#a2adc0' }, grid: { color: '#293446' } } } }
  });
  await loadAnalytics();
}

function analyticsParams() {
  const period = document.querySelector('#analytics-period').value;
  const params = new URLSearchParams({ period, year: document.querySelector('#analytics-year').value });
  if (period === 'quarter' || period === 'month') params.set(period, document.querySelector('#analytics-subperiod').value);
  if (period === 'week') params.set('from', document.querySelector('#analytics-from').value || new Date().toISOString().slice(0, 10));
  if (period === 'range') { params.set('from', document.querySelector('#analytics-from').value); params.set('to', document.querySelector('#analytics-to').value); }
  return params;
}

async function loadAnalytics() {
  const { data } = await request(`/api/admin/analytics?${analyticsParams()}`);
  const cur = data.current; const prev = data.previous;
  document.querySelector('#analytics-cards').innerHTML = [
    ['Đơn', cur.orders], ['Doanh thu', money(cur.revenue)], ['Lợi nhuận gộp', money(cur.profit)]
  ].map(([label,value]) => `<div class="col"><div class="admin-mini-stat"><small>${esc(label)}</small><strong>${esc(value)}</strong></div></div>`).join('');
  document.querySelector('#analytics-compare').textContent = `So sánh kỳ trước (${data.start} – ${data.end}): ${prev.orders} đơn · doanh thu ${money(prev.revenue)} · lợi nhuận gộp ${money(prev.profit)}.`;
  analyticsChart?.destroy();
  analyticsChart = new Chart(document.querySelector('#analytics-chart'), {
    type: 'line', data: { labels: data.series.map((x) => x.bucket), datasets: [
      { label: 'Doanh thu', data: data.series.map((x) => x.revenue), borderColor: '#3dd6c6', backgroundColor: '#3dd6c633', yAxisID: 'money', tension: .25 },
      { label: 'Lợi nhuận gộp', data: data.series.map((x) => x.profit), borderColor: '#ffd166', backgroundColor: '#ffd16633', yAxisID: 'money', tension: .25 },
      { label: 'Đơn hàng', data: data.series.map((x) => x.orders), borderColor: '#78baff', backgroundColor: '#78baff33', yAxisID: 'orders', tension: .25 },
      { label: 'Doanh thu kỳ trước', data: data.series.map((_, i) => data.comparisonSeries[i] ? data.comparisonSeries[i].revenue : null), borderColor: '#a1eee5', borderDash: [6,4], yAxisID: 'money', tension: .25 },
      { label: 'Lợi nhuận kỳ trước', data: data.series.map((_, i) => data.comparisonSeries[i] ? data.comparisonSeries[i].profit : null), borderColor: '#ffe5a3', borderDash: [6,4], yAxisID: 'money', tension: .25 },
      { label: 'Đơn kỳ trước', data: data.series.map((_, i) => data.comparisonSeries[i] ? data.comparisonSeries[i].orders : null), borderColor: '#b8d8ff', borderDash: [6,4], yAxisID: 'orders', tension: .25 }
    ] }, options: { responsive: true, interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { color: '#e8edf5' } } }, scales: {
      x: { ticks: { color: '#a2adc0' }, grid: { color: '#293446' } }, money: { position: 'left', ticks: { color: '#a2adc0', callback: (v) => `${Number(v).toLocaleString('en-US')}đ` }, grid: { color: '#293446' } },
      orders: { position: 'right', ticks: { color: '#a2adc0', precision: 0 }, grid: { drawOnChartArea: false } }
    } }
  });
}

async function loadOptions() {
  const [brands,categories] = await Promise.all([request('/api/admin/brands'),request('/api/admin/categories')]);
  document.querySelector('#product-form [name="brandId"]').innerHTML = brands.data.map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
  document.querySelector('#product-form [name="categoryId"]').innerHTML = categories.data.map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
}

async function loadProducts() {
  const params = new URLSearchParams({ page: productPage, limit: 10, q: productQuery });
  const result = await request(`/api/admin/products?${params}`);
  currentProducts = result.data;
  document.querySelector('#products-table').innerHTML = result.data.length ? result.data.map((p) => {
    const variants = p.variants.map((v) => `${money(v.price_vnd)} / vốn ${money(v.cost_vnd)} / tồn ${v.stock_quantity}`).join('<br>');
    return `<tr><td><strong>${esc(p.name)}</strong><div class="small text-secondary">${esc(p.slug)}</div></td><td>${esc(p.category)}<div class="small text-secondary">${esc(p.brand)}</div></td><td class="small">${variants}</td><td><span class="badge ${p.status === 'active' ? 'text-bg-success' : 'text-bg-secondary'}">${p.status === 'active' ? 'Đang bán' : 'Đang ẩn'}</span></td><td class="text-nowrap"><button class="btn btn-sm btn-outline-info" data-product-edit="${esc(p.id)}">Sửa</button> <button class="btn btn-sm btn-outline-danger" data-product-delete="${esc(p.id)}">Xóa</button></td></tr>`;
  }).join('') : '<tr><td colspan="5" class="text-secondary p-4">Không có sản phẩm.</td></tr>';
  pager('products-pagination', result, (page) => { productPage = page; loadProducts().catch(failNotice); });
}

function renderVariantRows(variants) {
  document.querySelector('#variant-rows').innerHTML = variants.map((variant, index) => `
    <fieldset class="variant-editor-row">
      <div class="d-flex justify-content-between align-items-center mb-2"><strong>Biến thể ${index + 1}</strong><button type="button" class="btn btn-sm btn-outline-danger" data-variant-remove>Xóa</button></div>
      <div class="row g-2">
        <div class="col-sm-6 col-lg-3"><label class="form-label small">SKU</label><input class="form-control" data-variant-field="sku" required minlength="3" maxlength="40" pattern="[A-Za-z0-9_-]+" value="${esc(variant.sku)}"></div>
        <div class="col-sm-6 col-lg-3"><label class="form-label small">Tên biến thể</label><input class="form-control" data-variant-field="name" required minlength="2" maxlength="100" value="${esc(variant.name)}"></div>
        <div class="col-sm-4 col-lg-2"><label class="form-label small">Giá bán (đ)</label><input class="form-control" data-variant-field="priceVnd" type="number" min="1" step="1" required value="${esc(variant.priceVnd)}"></div>
        <div class="col-sm-4 col-lg-2"><label class="form-label small">Giá vốn (đ)</label><input class="form-control" data-variant-field="costVnd" type="number" min="0" step="1" required value="${esc(variant.costVnd)}"></div>
        <div class="col-sm-4 col-lg-2"><label class="form-label small">Tồn kho</label><input class="form-control" data-variant-field="stock" type="number" min="0" step="1" required value="${esc(variant.stock)}"></div>
      </div>
    </fieldset>`).join('');
  document.querySelectorAll('[data-variant-remove]').forEach((button) => { button.disabled = variants.length <= 2; });
}

function editProduct(product) {
  const form = document.querySelector('#product-form'); form.classList.remove('d-none'); form.reset();
  form.elements.id.value = product?.id || '';
  document.querySelector('#product-form-title').textContent = product ? 'Sửa sản phẩm' : 'Thêm sản phẩm';
  if (product) {
    form.elements.name.value = product.name; form.elements.brandId.value = product.brand_id; form.elements.categoryId.value = product.category_id;
    form.elements.shortDescription.value = product.short_description; form.elements.description.value = product.description; form.elements.status.value = product.status;
    renderVariantRows(product.variants.map((v) => ({ sku: v.sku, name: v.name, priceVnd: Number(v.price_vnd), costVnd: Number(v.cost_vnd), stock: Number(v.stock_quantity) })));
    form.elements.images.value = product.images.map((image) => image.image_url).join('\n');
  } else {
    renderVariantRows([
      { sku: '', name: '', priceVnd: '', costVnd: '', stock: '' },
      { sku: '', name: '', priceVnd: '', costVnd: '', stock: '' }
    ]);
  }
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function loadUsers() {
  const params = new URLSearchParams({ page: userPage, limit: 20, q: userQuery });
  const result = await request(`/api/admin/users?${params}`); currentUsers = result.data;
  document.querySelector('#users-table').innerHTML = result.data.length ? result.data.map((u) => `<tr><td>${esc(u.full_name)}</td><td>${esc(u.email)}</td><td>${Number(u.loyalty_balance).toLocaleString('en-US')}</td><td>${dateTime(u.created_at)}</td><td><span class="badge ${u.is_banned ? 'text-bg-danger' : 'text-bg-success'}">${u.is_banned ? 'Đã khóa' : 'Hoạt động'}</span></td><td><button class="btn btn-sm btn-outline-info" data-user-edit="${esc(u.id)}">Sửa</button></td></tr>`).join('') : '<tr><td colspan="6" class="text-secondary p-4">Không có customer.</td></tr>';
  pager('users-pagination', result, (page) => { userPage = page; loadUsers().catch(failNotice); });
}

async function loadOrders() {
  const params = new URLSearchParams({ page: orderPage, limit: 20, range: orderRange });
  if (orderRange === 'custom') { params.set('from', document.querySelector('#order-from').value); params.set('to', document.querySelector('#order-to').value); }
  const result = await request(`/api/admin/orders?${params}`);
  document.querySelector('#orders-table').innerHTML = result.data.length ? result.data.map((o) => `<tr><td><strong>${esc(o.order_number)}</strong><div class="small text-secondary">${esc(o.email)}</div></td><td>${esc(o.customer_name)}</td><td>${dateTime(o.created_at)}</td><td>${money(o.total_vnd)}</td><td><span class="status-badge status-${esc(o.status)}">${esc(statusLabels[o.status] || o.status)}</span></td><td><button class="btn btn-sm btn-outline-info" data-order-id="${esc(o.id)}">Chi tiết</button></td></tr>`).join('') : '<tr><td colspan="6" class="text-secondary p-4">Không có đơn hàng.</td></tr>';
  pager('orders-pagination', result, (page) => { orderPage = page; loadOrders().catch(failNotice); });
}

async function loadDiscounts() {
  const result = await request('/api/admin/discounts');
  document.querySelector('#discounts-table').innerHTML = result.data.length ? result.data.map((d) => `<tr><td><strong class="font-monospace">${esc(d.code.trim())}</strong><div class="small text-secondary">${dateTime(d.created_at)}</div></td><td>${d.discount_type === 'percent' ? `${d.value}%` : money(d.value)}</td><td>${d.used_count} / ${d.max_uses}</td><td class="small">${d.orders.length ? d.orders.map((o) => `${esc(o.order_number)} · ${dateTime(o.created_at)}`).join('<br>') : '<span class="text-secondary">Chưa áp dụng</span>'}</td></tr>`).join('') : '<tr><td colspan="4" class="text-secondary p-4">Chưa có mã giảm giá.</td></tr>';
}

async function showOrder(id) {
  const { data:o } = await request(`/api/admin/orders/${id}`);
  const panel = document.querySelector('#order-detail-panel'); panel.classList.remove('d-none');
  panel.innerHTML = `<div class="d-flex flex-wrap justify-content-between gap-2"><div><div class="eyebrow">${esc(o.order_number)}</div><h3 class="h5">${esc(o.customer_name)} · ${esc(o.email)}</h3><div class="small text-secondary">${dateTime(o.created_at)} · ${esc(JSON.stringify(o.shipping_address_snapshot))}</div></div><button class="btn btn-outline-light btn-sm" id="order-detail-close">Đóng</button></div>
    <div class="table-responsive mt-3"><table class="table table-dark table-sm"><thead><tr><th>Sản phẩm</th><th>SKU</th><th>SL</th><th>Đơn giá</th><th>Tạm tính</th></tr></thead><tbody>${o.items.map((i) => `<tr><td>${esc(i.product_name_snapshot)} · ${esc(i.variant_name_snapshot)}</td><td>${esc(i.sku_snapshot)}</td><td>${i.quantity}</td><td>${money(i.unit_price_vnd)}</td><td>${money(i.line_total_vnd)}</td></tr>`).join('')}</tbody></table></div>
    <div class="row g-3"><div class="col-md-6"><label class="form-label">Trạng thái đơn</label><select id="order-status" class="form-select">${statuses.map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${esc(statusLabels[s])}</option>`).join('')}</select><label class="form-label mt-2">Ghi chú trạng thái</label><input id="order-status-note" class="form-control" maxlength="300"><button id="order-status-save" class="btn btn-info mt-2" data-order-save="${esc(o.id)}">Cập nhật trạng thái</button></div><div class="col-md-6"><strong>Lịch sử trạng thái</strong><ol class="status-timeline mt-2">${o.statusHistory.map((h) => `<li><span class="status-badge status-${esc(h.status)}">${esc(statusLabels[h.status] || h.status)}</span><div class="small">${dateTime(h.created_at)} · ${esc(h.changed_by || 'Hệ thống')}</div><div class="text-secondary small">${esc(h.note)}</div></li>`).join('')}</ol></div></div>
    <div class="summary-line mt-3"><span>Tạm tính ${money(o.subtotal_vnd)} · giảm ${money(o.discount_vnd)} · điểm ${money(o.loyalty_redeemed_vnd)} · thuế ${money(o.tax_vnd)} · ship ${money(o.shipping_fee_vnd)}</span><strong>${money(o.total_vnd)}</strong></div>`;
  panel.querySelector('#order-detail-close').addEventListener('click', () => panel.classList.add('d-none'));
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function failNotice(error) { show(error.message, true); }

document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', async () => {
  document.querySelectorAll('[data-tab]').forEach((item) => item.classList.toggle('active', item === button));
  document.querySelectorAll('.admin-panel').forEach((item) => item.classList.toggle('d-none', item.id !== `panel-${button.dataset.tab}`));
  const loaders = { dashboard: loadDashboard, products: loadProducts, users: loadUsers, orders: loadOrders, discounts: loadDiscounts };
  try { await loaders[button.dataset.tab](); } catch (error) { failNotice(error); }
}));

document.querySelector('#analytics-period').addEventListener('change', () => {
  const period = document.querySelector('#analytics-period').value;
  const year = document.querySelector('#analytics-year');
  const sub = document.querySelector('#analytics-subperiod');
  const dates = document.querySelector('#analytics-dates');
  year.classList.toggle('d-none', period === 'range' || period === 'week');
  sub.classList.toggle('d-none', !['quarter','month'].includes(period));
  dates.classList.toggle('d-none', !['range','week'].includes(period));
  if (period === 'quarter' || period === 'month') {
    const max = period === 'quarter' ? 4 : 12;
    sub.innerHTML = Array.from({ length: max }, (_, i) => `<option value="${i+1}">${period === 'quarter' ? `Quý ${i+1}` : `Tháng ${i+1}`}</option>`).join('');
    sub.value = period === 'quarter' ? String(Math.floor(new Date().getMonth()/3)+1) : String(new Date().getMonth()+1);
  }
  if (period === 'week') document.querySelector('#analytics-from').value = new Date().toISOString().slice(0,10);
  if (period === 'range') { document.querySelector('#analytics-from').value ||= new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10); document.querySelector('#analytics-to').value ||= new Date().toISOString().slice(0,10); }
});
document.querySelector('#analytics-year').value = new Date().getFullYear();
document.querySelector('#analytics-year').addEventListener('change', () => loadAnalytics().catch(failNotice));
document.querySelector('#analytics-subperiod').addEventListener('change', () => loadAnalytics().catch(failNotice));
document.querySelector('#analytics-apply').addEventListener('click', () => loadAnalytics().catch(failNotice));

document.querySelector('#product-new').addEventListener('click', () => editProduct(null));
document.querySelector('#product-cancel').addEventListener('click', () => document.querySelector('#product-form').classList.add('d-none'));
document.querySelector('#variant-add').addEventListener('click', () => {
  const rows = [...document.querySelectorAll('.variant-editor-row')];
  if (rows.length >= 20) return show('Mỗi sản phẩm tối đa 20 biến thể.', true);
  const variants = rows.map((row) => Object.fromEntries([...row.querySelectorAll('[data-variant-field]')].map((field) => [field.dataset.variantField, field.value])));
  variants.push({ sku: '', name: '', priceVnd: '', costVnd: '', stock: '' }); renderVariantRows(variants);
});
document.querySelector('#variant-rows').addEventListener('click', (event) => {
  if (!event.target.closest('[data-variant-remove]')) return;
  const rows = [...document.querySelectorAll('.variant-editor-row')];
  if (rows.length <= 2) return;
  const removeIndex = rows.indexOf(event.target.closest('.variant-editor-row'));
  const variants = rows.filter((_, index) => index !== removeIndex).map((row) => Object.fromEntries([...row.querySelectorAll('[data-variant-field]')].map((field) => [field.dataset.variantField, field.value])));
  renderVariantRows(variants);
});
document.querySelector('#product-search').addEventListener('submit', (e) => { e.preventDefault(); productQuery = new FormData(e.currentTarget).get('q'); productPage = 1; loadProducts().catch(failNotice); });
document.querySelector('#products-table').addEventListener('click', async (e) => {
  const editId = e.target.dataset.productEdit; const deleteId = e.target.dataset.productDelete;
  if (editId) editProduct(currentProducts.find((p) => p.id === editId));
  if (deleteId && window.confirm('Xóa sản phẩm này?')) try { await request(`/api/admin/products/${deleteId}`, 'DELETE'); show('Đã xóa sản phẩm.'); await loadProducts(); } catch (error) { failNotice(error); }
});
document.querySelector('#product-form').addEventListener('submit', async (e) => {
  e.preventDefault(); const f = e.currentTarget;
  try {
    const variants = [...document.querySelectorAll('.variant-editor-row')].map((row) => {
      const value = Object.fromEntries([...row.querySelectorAll('[data-variant-field]')].map((field) => [field.dataset.variantField, field.value]));
      value.priceVnd = Number(value.priceVnd); value.costVnd = Number(value.costVnd); value.stock = Number(value.stock);
      return value;
    });
    const images = f.elements.images.value.split(/\r?\n/).map((url) => url.trim()).filter(Boolean);
    const body = { name: f.elements.name.value, brandId: f.elements.brandId.value, categoryId: f.elements.categoryId.value,
      shortDescription: f.elements.shortDescription.value, description: f.elements.description.value, status: f.elements.status.value, variants, images };
    const id = f.elements.id.value;
    await request(id ? `/api/admin/products/${id}` : '/api/admin/products', id ? 'PATCH' : 'POST', body);
    f.classList.add('d-none'); show(id ? 'Đã cập nhật sản phẩm.' : 'Đã tạo sản phẩm.'); await loadProducts();
  } catch (error) { failNotice(error); }
});

document.querySelector('#user-search').addEventListener('submit', (e) => { e.preventDefault(); userQuery = new FormData(e.currentTarget).get('q'); userPage = 1; loadUsers().catch(failNotice); });
document.querySelector('#users-table').addEventListener('click', (e) => {
  const user = currentUsers.find((u) => u.id === e.target.dataset.userEdit); if (!user) return;
  const form = document.querySelector('#user-form'); form.classList.remove('d-none'); form.elements.id.value = user.id;
  form.elements.fullName.value = user.full_name; form.elements.email.value = user.email; form.elements.isBanned.checked = user.is_banned;
});
document.querySelector('#user-cancel').addEventListener('click', () => document.querySelector('#user-form').classList.add('d-none'));
document.querySelector('#user-form').addEventListener('submit', async (e) => {
  e.preventDefault(); const f = e.currentTarget;
  try { await request(`/api/admin/users/${f.elements.id.value}`, 'PATCH', { fullName: f.elements.fullName.value, email: f.elements.email.value, isBanned: f.elements.isBanned.checked }); f.classList.add('d-none'); show('Đã cập nhật customer.'); await loadUsers(); }
  catch (error) { failNotice(error); }
});

document.querySelector('#order-range').addEventListener('change', (e) => {
  orderRange = e.target.value;
  document.querySelector('#order-from').classList.toggle('d-none', orderRange !== 'custom');
  document.querySelector('#order-to').classList.toggle('d-none', orderRange !== 'custom');
});
document.querySelector('#order-filter').addEventListener('click', () => { orderPage = 1; loadOrders().catch(failNotice); });
document.querySelector('#orders-table').addEventListener('click', (e) => { const id = e.target.dataset.orderId; if (id) showOrder(id).catch(failNotice); });
document.querySelector('#order-detail-panel').addEventListener('click', async (e) => {
  const id = e.target.dataset.orderSave; if (!id) return;
  try { await request(`/api/admin/orders/${id}/status`, 'PATCH', { status: document.querySelector('#order-status').value, note: document.querySelector('#order-status-note').value }); show('Đã cập nhật trạng thái đơn hàng.'); await showOrder(id); await loadOrders(); }
  catch (error) { failNotice(error); }
});

document.querySelector('#discount-form').addEventListener('submit', async (e) => {
  e.preventDefault(); const form = e.currentTarget;
  try { await request('/api/admin/discounts', 'POST', { code: document.querySelector('#discount-code').value, type: document.querySelector('#discount-type').value, value: Number(document.querySelector('#discount-value').value), maxUses: Number(document.querySelector('#discount-max').value) }); form.reset(); document.querySelector('#discount-max').value = 10; show('Đã tạo mã giảm giá.'); await loadDiscounts(); }
  catch (error) { failNotice(error); }
});

document.querySelector('#admin-logout').addEventListener('click', async () => {
  try { await request('/api/auth/logout', 'POST'); window.location.assign('/'); } catch (error) { failNotice(error); }
});

(async () => {
  try { await loadOptions(); await loadDashboard(); document.querySelector('#admin-identity').textContent = 'Đăng nhập với vai trò admin'; }
  catch (error) { failNotice(error); }
})();
