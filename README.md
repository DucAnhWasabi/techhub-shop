# TechHub Shop

Đồ án Node.js bán máy tính và linh kiện. Stack: Express, EJS, PostgreSQL, Redis, Nginx.

## Chạy bằng Docker

1. Sao chép `.env.example` thành `.env`, đổi `POSTGRES_PASSWORD`, `SESSION_SECRET`, `ADMIN_PASSWORD`.
2. Chạy `docker compose up -d --build` (sau lần build đầu có thể dùng `docker compose up -d`).
3. Mở http://localhost:8080. Health check API: http://localhost:8080/api/health.

Compose build image và cài npm dependencies trong Dockerfile; PostgreSQL tự tạo schema rồi service seed chèn 40 sản phẩm máy tính/linh kiện, hai biến thể và ba ảnh mỗi sản phẩm, tài khoản admin cùng ba customer kèm địa chỉ mẫu.

## Tài khoản và xác thực

- Đăng ký: `/register`, đăng nhập: `/login`, hồ sơ/địa chỉ: `/account`.
- Tạo `.env` từ `.env.example`; đặt `SESSION_SECRET` ngẫu nhiên, dài. Session dùng Redis, cookie HttpOnly/SameSite=Lax; thao tác ghi cần CSRF token và endpoint đăng nhập có rate limit chia sẻ qua Redis.
- Google OAuth callback: `http://localhost:8080/api/auth/google/callback`; Facebook callback: `http://localhost:8080/api/auth/facebook/callback`. Thêm Client ID/Secret tương ứng vào `.env`, đăng ký đúng callback URL đó ở Google Cloud/Facebook Developer, rồi rebuild backend bằng `docker compose up -d --build`.
- Khôi phục mật khẩu cần SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`). Khi chạy local không cấu hình SMTP, link reset được ghi trong `docker compose logs backend`; production không ghi token ra log.
- Migration idempotent tạo bảng token reset mật khẩu và index địa chỉ mặc định, nên vẫn áp dụng được trên volume DB từ giai đoạn trước.
- Checkout chưa được dựng ở giai đoạn này. `src/services/users.js` cung cấp `ensureGuestCustomer(client, ...)` để luồng đặt hàng guest gọi bên trong transaction; tài khoản mới được gắn với email đơn hàng và lưu địa chỉ giao hàng mặc định. Checkout sẽ kết nối helper này ở giai đoạn tương ứng.

## Catalog, sản phẩm và đánh giá

- Trang chủ có sản phẩm mới, bán chạy (mỗi phần phân trang) và các danh mục; catalog ở `/products`, danh mục ở `/categories/:slug`, tìm kiếm ở `/search?q=...`.
- Catalog API: `GET /api/products` nhận `page`, `limit`, `q`, `category`, `brand`, `minPrice`, `maxPrice`, `inStock`, `sort`. `sort`: `name_asc`, `name_desc`, `price_asc`, `price_desc`, `newest`, `best_sellers`. API danh sách luôn trả `totalPages` tối thiểu bằng 1.
- API landing: `GET /api/products/new`, `GET /api/products/best-sellers`; metadata: `GET /api/categories`, `GET /api/brands`.
- Chi tiết: `GET /api/products/:slug` trả ảnh, mô tả, biến thể, giá và tồn độc lập; bình luận: `GET/POST /api/products/:id/reviews`; rating: `POST /api/products/:id/ratings` (customer đăng nhập, không kiểm tra đã mua).
- Socket.IO event trong room sản phẩm: `product:review:new`, `product:rating:updated`; Redis adapter chuyển tiếp event giữa hai backend.

## Giỏ hàng, checkout và đơn hàng

- Giỏ: `/cart`; API `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:id`, `DELETE /api/cart/items/:id`, `DELETE /api/cart`. Cart guest dùng cookie HttpOnly ngẫu nhiên, DB chỉ lưu hash token; khi customer đăng nhập và mở giỏ, các dòng guest được gộp vào giỏ tài khoản.
- Checkout nhiều bước tại `/checkout`; `POST /api/checkout/quote` tính coupon/điểm/thuế/phí trước khi đặt, `POST /api/checkout/place-order` tạo đơn COD.
- Chính sách mẫu: thuế 10% trên subtotal sau giảm coupon; giao hàng 30.000đ, miễn phí từ 1.000.000đ. Điểm: 1 điểm = 1.000đ; đơn tích 10% tổng thanh toán quy thành điểm (1.000.000đ = 100 điểm). Tài khoản đã đăng nhập dùng điểm có sẵn.
- Seed coupon demo `TECH5` giảm 5%, tối đa 10 lượt. Coupon được kiểm tra lại và khóa trong transaction lúc đặt để không vượt giới hạn sử dụng.
- Tồn kho, coupon, số dư điểm, order, order items và trạng thái `pending` cùng lịch sử được cập nhật trong transaction. Email xác nhận gửi sau commit qua SMTP.
- Customer xem lịch sử ở `/orders`, chi tiết `/orders/:id`; API `GET /api/me/orders` phân trang mới nhất trước và `GET /api/me/orders/:id` trả lịch sử trạng thái mới nhất trước. Guest checkout tạo/liên kết customer theo email trong cùng transaction; khách tạo mật khẩu sau bằng “Quên mật khẩu” để xem đơn sau này.

Tài khoản demo mặc định (đổi trong `.env` trước khi chạy):

- Admin: `admin@techhub.local` / `Admin123!ChangeMe`
- Customer: `minh.nguyen@example.com` / `Customer123!ChangeMe`

Compose chạy hai bản sao backend qua `deploy.replicas`. Nginx 1.27 tự phân giải địa chỉ service Docker và cân bằng các request API tới backend replicas. Uploads sẽ dùng volume dùng chung ở giai đoạn tính năng upload.

## Kiểm tra thủ công

- `docker compose ps` xác nhận các service đã chạy và có hai container `backend`.
- Mở `/` để xem trang landing page và sản phẩm từ DB.
- Gọi `GET /api/products` và xác nhận có 40 sản phẩm.
- Gọi `GET /api/health` để kiểm tra API.
- Tạo tài khoản tại `/register`, xác nhận tới `/account`, sau đó thử sửa tên, thêm/sửa/xóa địa chỉ, đổi địa chỉ mặc định và đổi mật khẩu.
- Đăng xuất rồi đăng nhập lại tại `/login`; gửi yêu cầu khôi phục mật khẩu tại `/forgot-password` và lấy link từ SMTP hoặc log local.
- Mở `/api/auth/providers` để xem OAuth provider đã được cấu hình; khi chưa có credentials, các nút OAuth sẽ bị ẩn.

Schema được khởi tạo trên volume mới. Khi thay đổi schema trong lúc phát triển, thêm migration; file `db/schema.sql` init chỉ tự chạy khi volume PostgreSQL chưa có dữ liệu.
