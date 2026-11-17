# Sequence 12 - Checkout, COD order và lịch sử mua hàng

```mermaid
sequenceDiagram
    actor Customer
    actor Guest
    participant Browser as Browser - boundary
    participant API as Express API - control
    participant Checkout as Checkout Service - control
    participant Cart as Cart Service - control
    participant DB as PostgreSQL - database
    participant Mailer as Mailer or local log - entity

    Customer->>Browser: Chọn địa chỉ lưu hoặc nhập địa chỉ khác
    Guest->>Browser: Nhập email, tên và địa chỉ giao hàng
    Browser->>API: POST /api/checkout/quote + coupon/điểm + CSRF
    API->>Cart: Resolve cart hiện tại
    API->>Checkout: Kiểm tra item, tồn kho, coupon và số dư loyalty
    Checkout->>DB: Đọc cart, variants, discount và loyalty_balance
    Checkout->>Checkout: Tính giảm giá, thuế 10%, phí ship, COD và điểm
    API-->>Browser: Quote để người mua xác nhận

    Customer->>Browser: Xác nhận đặt COD
    Guest->>Browser: Xác nhận đặt COD
    Browser->>API: POST /api/checkout/place-order + thông tin giao hàng + CSRF
    API->>Checkout: Bắt đầu transaction đặt hàng
    Checkout->>Cart: Resolve cart
    Checkout->>DB: Lock cart/items, variants, customer và coupon
    Checkout->>DB: Tạo/liên kết customer cho guest theo email
    Checkout->>DB: Insert order và order_items snapshot
    Checkout->>DB: Trừ tồn kho; ghi status history
    Checkout->>DB: Tăng used_count, ghi redemption và loyalty ledger
    Checkout->>DB: Xóa cart_items và COMMIT
    Checkout->>Mailer: Gửi email xác nhận sau commit
    Mailer-->>Checkout: Gửi được hoặc lỗi được ghi log
    API-->>Browser: Mã đơn, tổng COD, trạng thái email

    Customer->>Browser: Mở lịch sử /orders
    Browser->>API: GET /api/me/orders?page&limit
    API->>DB: Đọc các đơn của customer hiện tại
    DB-->>Browser: Danh sách đơn phân trang
    Customer->>Browser: Mở chi tiết đơn
    Browser->>API: GET /api/me/orders/{id}
    API->>DB: Đọc order, snapshot items và status history theo owner
    DB-->>Browser: Chi tiết đơn và lịch sử trạng thái
```

Related code: `frontend/public/js/checkout.js`, `frontend/public/js/orders.js`, `frontend/public/js/order-detail.js`, `src/routes/checkoutRoutes.js`, `src/routes/orderRoutes.js`, `src/services/checkoutService.js`, `src/services/orderService.js`, `src/services/pricing.js`, `src/services/mailer.js`.

`POST /api/checkout/quote` tính preview; `POST /api/checkout/place-order` tính lại và thực hiện giao dịch thật trong transaction. Checkout hỗ trợ địa chỉ đã lưu cho customer hoặc địa chỉ nhập tay, coupon 5 ký tự, loyalty points, thuế 10%, phí giao hàng 30.000đ và miễn phí từ 1.000.000đ. Thanh toán hiện là COD; chưa có payment gateway. Email là hậu xử lý sau commit, nên lỗi SMTP không hủy đơn. Guest order được gắn với customer theo email. Order history/detail yêu cầu đăng nhập; hiện chưa có API cập nhật trạng thái đơn.
