const paramsFromUrl = new URLSearchParams(window.location.search);
const categoryOnPath = document.body.dataset.category;
const filtersForm = document.querySelector('#filters');
const productsTarget = document.querySelector('#catalog-products');
const formatPrice = (value) => `${Number(value).toLocaleString('en-US')}đ`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function card(product) {
  const image = product.image_url
    ? `<img class="product-image" src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy">`
    : `<div class="product-image d-flex align-items-center justify-content-center">${escapeHtml(product.category)}</div>`;
  return `<div class="col-12 col-sm-6 col-xl-4"><a class="product-link" href="/products/${encodeURIComponent(product.slug)}"><article class="product-card">
    ${image}<div class="card-body"><div class="product-brand">${escapeHtml(product.brand)} · ${escapeHtml(product.category)}</div>
      <h2 class="h6 mt-2">${escapeHtml(product.name)}</h2><p class="small text-secondary">${escapeHtml(product.short_description)}</p>
      <div class="product-rating">${Number(product.average_rating).toFixed(1)} ★ <span>(${Number(product.rating_count)} đánh giá)</span></div>
      <div class="product-price mt-2">${formatPrice(product.price_vnd)}</div></div></article></a></div>`;
}

async function populateOptions() {
  const [categoriesResponse, brandsResponse] = await Promise.all([fetch('/api/categories'), fetch('/api/brands')]);
  const categories = (await categoriesResponse.json()).data;
  const brands = (await brandsResponse.json()).data;
  const categorySelect = document.querySelector('#category');
  const brandSelect = document.querySelector('#brand');
  categorySelect.insertAdjacentHTML('beforeend', categories.map((item) => `<option value="${escapeHtml(item.slug)}">${escapeHtml(item.name)}</option>`).join(''));
  brandSelect.insertAdjacentHTML('beforeend', brands.map((item) => `<option value="${escapeHtml(item.slug)}">${escapeHtml(item.name)}</option>`).join(''));
  const urlCategory = paramsFromUrl.get('category') || categoryOnPath;
  if (urlCategory) categorySelect.value = urlCategory;
  if (paramsFromUrl.has('brand')) brandSelect.value = paramsFromUrl.get('brand');
  for (const id of ['minPrice', 'maxPrice']) if (paramsFromUrl.has(id)) document.querySelector(`#${id}`).value = paramsFromUrl.get(id);
  if (paramsFromUrl.get('inStock') === 'true') document.querySelector('#inStock').checked = true;
  if (paramsFromUrl.has('sort')) document.querySelector('#sort').value = paramsFromUrl.get('sort');
  if (paramsFromUrl.has('q')) document.querySelector('nav form input[name="q"]').value = paramsFromUrl.get('q');
  const category = categories.find((item) => item.slug === urlCategory);
  if (category) document.querySelector('#catalog-title').textContent = category.name;
  if (paramsFromUrl.has('q')) document.querySelector('#catalog-title').textContent = `Tìm kiếm: “${paramsFromUrl.get('q')}”`;
}

function currentParams() {
  const url = new URL(window.location.href);
  const result = new URLSearchParams();
  const category = document.querySelector('#category').value || categoryOnPath;
  const brand = document.querySelector('#brand').value;
  const min = document.querySelector('#minPrice').value;
  const max = document.querySelector('#maxPrice').value;
  const query = paramsFromUrl.get('q');
  if (category) result.set('category', category);
  if (brand) result.set('brand', brand);
  if (min) result.set('minPrice', min);
  if (max) result.set('maxPrice', max);
  if (query) result.set('q', query);
  if (document.querySelector('#inStock').checked) result.set('inStock', 'true');
  result.set('sort', document.querySelector('#sort').value);
  result.set('page', url.searchParams.get('page') || '1');
  return result;
}

function renderPages(target, current, total) {
  target.innerHTML = Array.from({ length: total }, (_, index) => {
    const page = index + 1;
    return `<button type="button" class="page-button ${page === current ? 'active' : ''}" data-page="${page}" aria-current="${page === current ? 'page' : 'false'}">${page}</button>`;
  }).join('');
}

async function loadProducts() {
  const query = currentParams();
  const apiPath = query.has('q') ? '/api/products/search' : '/api/products';
  const response = await fetch(`${apiPath}?${query}`);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Không tải được sản phẩm.');
  productsTarget.innerHTML = result.data.length ? result.data.map(card).join('') : '<div class="col-12 empty-state">Không tìm thấy sản phẩm phù hợp.</div>';
  document.querySelector('#result-count').textContent = `${result.total} sản phẩm`;
  const first = result.total ? (result.page - 1) * result.limit + 1 : 0;
  const last = Math.min(result.page * result.limit, result.total);
  document.querySelector('#view-range').textContent = `${first}–${last} / ${result.total}`;
  renderPages(document.querySelector('#pagination'), result.page, result.totalPages);
  const visible = new URL(window.location.href);
  visible.search = query.toString();
  history.replaceState({}, '', visible);
}

filtersForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = currentParams(); query.set('page', '1');
  const url = new URL(window.location.href); url.search = query.toString();
  history.pushState({}, '', url); loadProducts().catch(showError);
});

document.querySelector('#pagination').addEventListener('click', (event) => {
  const button = event.target.closest('[data-page]');
  if (!button) return;
  const query = currentParams(); query.set('page', button.dataset.page);
  const url = new URL(window.location.href); url.search = query.toString();
  history.pushState({}, '', url); loadProducts().catch(showError);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.querySelector('#clear-filters').addEventListener('click', () => {
  document.querySelector('#category').value = categoryOnPath || '';
  document.querySelector('#brand').value = '';
  document.querySelector('#minPrice').value = '';
  document.querySelector('#maxPrice').value = '';
  document.querySelector('#inStock').checked = false;
  document.querySelector('#sort').value = 'name_asc';
  const url = new URL(window.location.href); url.search = '';
  history.pushState({}, '', url); loadProducts().catch(showError);
});

document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-view]').forEach((item) => item.classList.toggle('active', item === button));
  productsTarget.classList.toggle('list-view', button.dataset.view === 'list');
}));

window.addEventListener('popstate', () => window.location.reload());
function showError(error) { document.querySelector('#catalog-error').textContent = error.message; document.querySelector('#catalog-error').classList.remove('d-none'); }

populateOptions().then(loadProducts).catch(showError);
