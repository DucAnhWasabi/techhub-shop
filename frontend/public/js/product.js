const slug = decodeURIComponent(window.location.pathname.split('/').pop());
const target = document.querySelector('#product-detail');
const notice = document.querySelector('#review-notice');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const formatPrice = (value) => `${Number(value).toLocaleString('en-US')}đ`;
let product;
let reviewPage = 1;
let csrfToken;
let canRate = false;

function productMarkup(item) {
  const firstImage = item.images[0];
  const image = firstImage
    ? `<img id="main-image" class="detail-main-image" src="${escapeHtml(firstImage.image_url)}" alt="${escapeHtml(firstImage.alt_text || item.name)}">`
    : '<div id="main-image" class="detail-main-image d-flex align-items-center justify-content-center">TechHub</div>';
  const thumbs = item.images.map((itemImage, index) => `
    <button class="thumb-button ${index === 0 ? 'active' : ''}" type="button" data-image="${index}" aria-label="Xem ảnh ${index + 1}">
      <img src="${escapeHtml(itemImage.image_url)}" alt="${escapeHtml(itemImage.alt_text || item.name)}" loading="lazy"></button>`).join('');
  const variants = item.variants.map((variant, index) => `
    <label class="variant-option ${index === 0 ? 'selected' : ''}"><input type="radio" name="variant" value="${escapeHtml(variant.id)}" ${index === 0 ? 'checked' : ''}>
      <span><strong>${escapeHtml(variant.name)}</strong><small>${escapeHtml(variant.sku)} · ${Number(variant.stock_quantity)} còn hàng</small></span>
      <b>${formatPrice(variant.price_vnd)}</b></label>`).join('');
  return `<div class="col-lg-6"><div class="detail-gallery">${image}<div class="thumb-strip">${thumbs}</div></div></div>
    <div class="col-lg-6"><div class="product-brand">${escapeHtml(item.brand)} · ${escapeHtml(item.category)}</div>
      <h1 class="display-6 fw-bold mt-2">${escapeHtml(item.name)}</h1><div class="product-rating mb-3"><strong>${Number(item.average_rating).toFixed(1)} ★</strong> <span>(${Number(item.rating_count)} đánh giá)</span></div>
      <p class="lead text-secondary">${escapeHtml(item.short_description)}</p><div class="detail-price" id="variant-price"></div>
      <h2 class="h6 mt-4">Chọn biến thể</h2><div class="d-grid gap-2" id="variants">${variants || '<div class="text-secondary">Chưa có biến thể đang bán.</div>'}</div>
      <div class="d-flex gap-2 mt-3"><input id="add-quantity" class="form-control quantity-input" type="number" min="1" max="99" value="1" aria-label="Số lượng"><button id="add-to-cart" class="btn btn-info fw-semibold flex-fill" type="button" ${item.variants.length ? '' : 'disabled'}>Thêm vào giỏ</button></div>
      <div class="detail-description mt-4"><h2 class="h5">Mô tả sản phẩm</h2><div>${escapeHtml(item.description)}</div></div>
      <a class="btn btn-outline-info mt-4" href="/categories/${encodeURIComponent(item.category_slug)}">Xem thêm ${escapeHtml(item.category)}</a>
    </div>`;
}

function updateSelectedVariant() {
  const input = document.querySelector('input[name="variant"]:checked');
  if (!input) return;
  const variant = product.variants.find((item) => item.id === input.value);
  document.querySelector('#variant-price').textContent = formatPrice(variant.price_vnd);
  document.querySelectorAll('.variant-option').forEach((item) => item.classList.toggle('selected', item.contains(input)));
}

function renderReviews(data, append = false) {
  const container = document.querySelector('#reviews');
  const markup = data.length ? data.map((review) => `
    <article class="review-card"><div class="d-flex justify-content-between gap-2"><strong>${escapeHtml(review.author_name)}</strong>
      <time class="small text-secondary" datetime="${escapeHtml(review.created_at)}">${new Date(review.created_at).toLocaleString('vi-VN')}</time></div>
      <p class="mb-0 mt-2 review-body">${escapeHtml(review.body)}</p></article>`).join('')
    : '<div class="text-secondary">Chưa có bình luận. Hãy là người đầu tiên chia sẻ nhận xét.</div>';
  if (append) container.insertAdjacentHTML('afterbegin', markup);
  else container.innerHTML = markup;
  const pages = Array.from({ length: data.totalPages }, (_, index) => index + 1);
  document.querySelector('#review-pagination').innerHTML = pages.map((page) =>
    `<button class="page-button ${page === data.page ? 'active' : ''}" data-review-page="${page}" aria-current="${page === data.page ? 'page' : 'false'}">${page}</button>`
  ).join('');
}

async function loadReviews(page = 1) {
  reviewPage = page;
  const result = await fetch(`/api/products/${product.id}/reviews?page=${page}`).then((response) => response.json());
  if (!result.data) throw new Error(result.error || 'Không tải được bình luận.');
  renderReviews(result);
}

function showNotice(message, error = false) {
  notice.textContent = message;
  notice.className = `alert ${error ? 'alert-danger' : 'alert-success'}`;
}

async function getCsrf() {
  if (!csrfToken) csrfToken = (await fetch('/api/auth/csrf').then((response) => response.json())).csrfToken;
  return csrfToken;
}

async function post(path, body) {
  const response = await fetch(path, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await getCsrf() },
    body: JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Không thể gửi yêu cầu.');
  return result;
}

async function start() {
  const response = await fetch(`/api/products/${encodeURIComponent(slug)}`);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Không tìm thấy sản phẩm.');
  product = result.data;
  document.title = `${product.name} — TechHub`;
  document.querySelector('#crumb-category').textContent = product.category;
  target.innerHTML = productMarkup(product);
  updateSelectedVariant();
  document.querySelector('#variants').addEventListener('change', updateSelectedVariant);
  document.querySelector('.thumb-strip')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-image]');
    if (!button) return;
    const image = product.images[Number(button.dataset.image)];
    const main = document.querySelector('#main-image');
    main.src = image.image_url; main.alt = image.alt_text || product.name;
    document.querySelectorAll('.thumb-button').forEach((item) => item.classList.toggle('active', item === button));
  });
  document.querySelector('#rating-summary').textContent = `${Number(product.average_rating).toFixed(1)} ★ · ${Number(product.rating_count)} đánh giá`;
  document.querySelector('#stars').value = product.my_rating || '5';
  await loadReviews();
  const cartSummary = await fetch('/api/cart').then((result) => result.json());
  document.querySelector('#cart-count').textContent = cartSummary.data.items.reduce((sum, item) => sum + item.quantity, 0);
  const profileResponse = await fetch('/api/me');
  if (profileResponse.ok) {
    const profile = (await profileResponse.json()).data;
    canRate = profile.role === 'customer';
    if (canRate) {
      document.querySelector('#review-name-wrap').classList.add('d-none');
      document.querySelector('#review-name').required = false;
      document.querySelector('#rating-hint').textContent = product.my_rating
        ? `Bạn đã đánh giá ${product.my_rating} sao. Gửi lại để cập nhật đánh giá.`
        : 'Bạn có thể đánh giá ngay, không cần đã mua hàng.';
    }
  }
  const socket = io({ path: '/socket.io', transports: ['websocket'] });
  socket.on('connect', () => socket.emit('product:join', product.id));
  socket.on('product:review:new', (review) => renderReviews({ data: [review], page: reviewPage, totalPages: 1 }, true));
  socket.on('product:rating:updated', (rating) => {
    document.querySelector('#rating-summary').textContent = `${Number(rating.average_rating).toFixed(1)} ★ · ${Number(rating.rating_count)} đánh giá`;
  });
}

document.querySelector('#product-detail').addEventListener('click', async (event) => {
  if (event.target.id !== 'add-to-cart') return;
  const variant = document.querySelector('input[name="variant"]:checked');
  const noticeBox = document.querySelector('#cart-notice');
  if (!variant) return;
  try {
    const token = await getCsrf();
    const response = await fetch('/api/cart/items', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
      body: JSON.stringify({ variantId: variant.value, quantity: Number(document.querySelector('#add-quantity').value) })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Không thể thêm sản phẩm vào giỏ.');
    document.querySelector('#cart-count').textContent = result.data.items.reduce((sum, item) => sum + item.quantity, 0);
    noticeBox.textContent = 'Đã thêm sản phẩm vào giỏ hàng.';
    noticeBox.className = 'alert alert-success mt-3';
  } catch (error) {
    noticeBox.textContent = error.message;
    noticeBox.className = 'alert alert-danger mt-3';
  }
});

document.querySelector('#review-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = document.querySelector('#review-body').value;
  const authorName = document.querySelector('#review-name').value;
  try {
    await post(`/api/products/${product.id}/reviews`, { body, authorName });
    event.target.reset(); showNotice('Đã gửi bình luận.');
    await loadReviews(1);
  } catch (error) { showNotice(error.message, true); }
});

document.querySelector('#rating-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const result = await post(`/api/products/${product.id}/ratings`, { stars: Number(document.querySelector('#stars').value) });
    const rating = result.data;
    document.querySelector('#rating-summary').textContent = `${Number(rating.average_rating).toFixed(1)} ★ · ${Number(rating.rating_count)} đánh giá`;
    document.querySelector('#rating-hint').textContent = `Bạn đã đánh giá ${rating.myRating} sao.`;
    showNotice('Đã lưu đánh giá sao.');
  } catch (error) { showNotice(`${error.message}${error.message.includes('đăng nhập') ? ' Mở trang đăng nhập.' : ''}`, true); }
});

document.querySelector('#review-pagination').addEventListener('click', (event) => {
  const page = Number(event.target.dataset.reviewPage);
  if (page) loadReviews(page).catch((error) => showNotice(error.message, true));
});

start().catch((error) => {
  document.querySelector('#product-error').textContent = error.message;
  document.querySelector('#product-error').classList.remove('d-none');
});
