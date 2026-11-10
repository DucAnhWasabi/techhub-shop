const money = (value) => `${Number(value).toLocaleString('en-US')}đ`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const labels = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', processing: 'Đang xử lý', shipped: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy' };
const pageSize = 10;
let page = 1;

async function load() {
  const response = await fetch(`/api/me/orders?page=${page}&limit=${pageSize}`);
  const result = await response.json();
  if (response.status === 401) { window.location.assign('/login'); return; }
  if (!response.ok) throw new Error(result.error || 'Không tải được lịch sử đơn hàng.');
  const target = document.querySelector('#orders-list');
  target.innerHTML = result.data.length ? result.data.map((order) => `
    <a class="order-card" href="/orders/${order.id}"><div><span class="text-secondary small">${new Date(order.created_at).toLocaleString('vi-VN')}</span><h2 class="h6 mt-1 mb-0">${escapeHtml(order.order_number)}</h2><span class="small text-secondary">${order.item_count} dòng sản phẩm</span></div>
    <div class="text-end"><span class="status-badge status-${escapeHtml(order.status)}">${escapeHtml(labels[order.status] || order.status)}</span><strong class="d-block mt-2">${money(order.total_vnd)}</strong></div></a>`).join('') : '<div class="empty-state">Bạn chưa có đơn hàng nào.</div>';
  document.querySelector('#orders-pagination').innerHTML = Array.from({ length: result.totalPages }, (_, index) => `<button class="page-button ${index + 1 === result.page ? 'active' : ''}" data-page="${index + 1}">${index + 1}</button>`).join('');
}

document.querySelector('#orders-pagination').addEventListener('click', (event) => {
  const nextPage = Number(event.target.dataset.page);
  if (!nextPage) return;
  page = nextPage; load().catch(showError);
});

function showError(error) { const box = document.querySelector('#orders-notice'); box.textContent = error.message; box.classList.remove('d-none'); }
load().catch(showError);
