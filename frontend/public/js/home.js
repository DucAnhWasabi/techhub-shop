const price = (value) => `${Number(value).toLocaleString('en-US')}đ`;
fetch('/api/products').then((response) => {
  if (!response.ok) throw new Error('Không tải được danh sách sản phẩm.');
  return response.json();
}).then(({ data }) => {
  const target = document.querySelector('#products');
  if (!data.length) { target.innerHTML = '<div class="col-12 text-secondary">Chưa có sản phẩm.</div>'; return; }
  target.innerHTML = data.map((product) => `
    <div class="col-12 col-sm-6 col-xl-3"><article class="product-card">
      <div class="product-image d-flex align-items-center justify-content-center text-secondary">${escapeHtml(product.category)}</div>
      <div class="card-body"><div class="product-brand">${escapeHtml(product.brand)}</div>
        <h3 class="h6 mt-2">${escapeHtml(product.name)}</h3>
        <p class="small text-secondary">${escapeHtml(product.short_description)}</p>
        <div class="product-price">${price(product.price_vnd)}</div>
      </div></article></div>`).join('');
}).catch((error) => { document.querySelector('#products').innerHTML = `<div class="col-12 text-warning">${error.message}</div>`; });

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
