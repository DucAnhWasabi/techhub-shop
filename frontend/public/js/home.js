const formatPrice = (value) => `${Number(value).toLocaleString('en-US')}đ`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function card(product) {
  const image = product.image_url
    ? `<img class="product-image" src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy">`
    : `<div class="product-image d-flex align-items-center justify-content-center">${escapeHtml(product.category)}</div>`;
  return `<div class="col-12 col-sm-6 col-xl-3"><a class="product-link" href="/products/${encodeURIComponent(product.slug)}"><article class="product-card">
    ${image}<div class="card-body"><div class="product-brand">${escapeHtml(product.brand)}</div><h3 class="h6 mt-2">${escapeHtml(product.name)}</h3>
    <p class="small text-secondary">${escapeHtml(product.short_description)}</p><div class="product-rating">${Number(product.average_rating).toFixed(1)} ★ <span>(${Number(product.rating_count)} đánh giá)</span></div>
    <div class="product-price mt-2">${formatPrice(product.price_vnd)}</div></div></article></a></div>`;
}

function renderMiniPages(target, source, current, total) {
  target.innerHTML = Array.from({ length: total }, (_, index) => {
    const page = index + 1;
    return `<button class="page-button ${page === current ? 'active' : ''}" data-source="${source}" data-page="${page}" aria-current="${page === current ? 'page' : 'false'}">${page}</button>`;
  }).join('');
}

async function loadSection(source) {
  const section = source === 'new' ? 'new-products' : 'best-products';
  const pager = document.querySelector(source === 'new' ? '#new-pagination' : '#best-pagination');
  const params = new URLSearchParams({ page: String(Number(pager.dataset.page || 1)), limit: '4' });
  const response = await fetch(`/api/products/${source === 'new' ? 'new' : 'best-sellers'}?${params}`);
  if (!response.ok) throw new Error('Không tải được sản phẩm.');
  const result = await response.json();
  document.querySelector(`#${section}`).innerHTML = result.data.length
    ? result.data.map(card).join('') : '<div class="col-12 text-secondary">Chưa có sản phẩm.</div>';
  pager.dataset.page = result.page;
  renderMiniPages(pager, source, result.page, result.totalPages);
}

async function loadCategories() {
  const response = await fetch('/api/categories');
  const { data } = await response.json();
  document.querySelector('#categories').innerHTML = data.map((category) => `
    <div class="col-6 col-md-4 col-lg-2"><a class="category-tile" href="/categories/${encodeURIComponent(category.slug)}">
      <span class="category-symbol">${escapeHtml(category.name.slice(0, 2).toUpperCase())}</span><strong>${escapeHtml(category.name)}</strong>
      <small>${Number(category.product_count)} sản phẩm</small></a></div>`).join('');
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-source][data-page]');
  if (!button) return;
  const pager = document.querySelector(button.dataset.source === 'new' ? '#new-pagination' : '#best-pagination');
  pager.dataset.page = button.dataset.page;
  loadSection(button.dataset.source).catch(() => {});
});

Promise.all([loadSection('new'), loadSection('best'), loadCategories()]).catch((error) => {
  document.querySelector('#new-products').innerHTML = `<div class="col-12 text-warning">${escapeHtml(error.message)}</div>`;
});
