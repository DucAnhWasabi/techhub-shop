const money = (value) => `${Number(value).toLocaleString('en-US')}đ`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const labels = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', processing: 'Đang xử lý', shipped: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy' };

async function load() {
  const id = window.location.pathname.split('/').pop();
  const response = await fetch(`/api/me/orders/${encodeURIComponent(id)}`);
  const result = await response.json();
  if (response.status === 401) { window.location.assign('/login'); return; }
  if (!response.ok) throw new Error(result.error || 'Không tìm thấy đơn hàng.');
  const order = result.data;
  const address = order.shipping_address_snapshot || {};
  document.title = `${order.order_number} — TechHub`;
  document.querySelector('#order-detail').innerHTML = `
    <div class="eyebrow">ORDER DETAILS</div><div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4"><h1 class="h2 mb-0">${escapeHtml(order.order_number)}</h1><span class="status-badge status-${escapeHtml(order.status)}">${escapeHtml(labels[order.status] || order.status)}</span></div>
    <p class="text-secondary">Đặt lúc ${new Date(order.created_at).toLocaleString('vi-VN')}</p>
    <div class="row g-4"><section class="col-lg-7"><div class="auth-panel p-4 rounded-4"><h2 class="h5">Sản phẩm</h2>${order.items.map((item) => `<div class="summary-line align-items-start py-2"><span>${escapeHtml(item.product_name_snapshot)}<small class="d-block text-secondary">${escapeHtml(item.variant_name_snapshot)} · ${escapeHtml(item.sku_snapshot)} × ${item.quantity}</small></span><strong>${money(item.line_total_vnd)}</strong></div>`).join('')}</div>
      <div class="auth-panel p-4 rounded-4 mt-3"><h2 class="h5">Lịch sử trạng thái</h2><ol class="status-timeline">${order.statusHistory.map((entry) => `<li><span class="status-badge status-${escapeHtml(entry.status)}">${escapeHtml(labels[entry.status] || entry.status)}</span><time class="small text-secondary ms-2">${new Date(entry.created_at).toLocaleString('vi-VN')}</time>${entry.note ? `<p class="small text-secondary mb-0 mt-1">${escapeHtml(entry.note)}</p>` : ''}</li>`).join('')}</ol></div></section>
      <aside class="col-lg-5"><div class="auth-panel p-4 rounded-4"><h2 class="h5">Giao hàng & thanh toán</h2><p>${escapeHtml(order.recipient_name)}<br>${escapeHtml([address.line1,address.line2,address.ward,address.district,address.province,address.postalCode].filter(Boolean).join(', '))}<br>${escapeHtml(order.email)}</p>
        <div class="summary-line"><span>Tạm tính</span><strong>${money(order.subtotal_vnd)}</strong></div><div class="summary-line"><span>Giảm giá</span><strong>−${money(order.discount_vnd)}</strong></div><div class="summary-line"><span>Thuế</span><strong>${money(order.tax_vnd)}</strong></div><div class="summary-line"><span>Giao hàng</span><strong>${money(order.shipping_fee_vnd)}</strong></div><div class="summary-line"><span>Điểm đã dùng</span><strong>−${money(order.loyalty_redeemed_vnd)}</strong></div><hr class="border-secondary"><div class="summary-line total-line"><span>Tổng COD</span><strong>${money(order.total_vnd)}</strong></div></div></aside></div>`;
}

load().catch((error) => { const box = document.querySelector('#order-detail-notice'); box.textContent = error.message; box.classList.remove('d-none'); });
