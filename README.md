# TechHub Shop

Đồ án Node.js bán máy tính và linh kiện. Stack: Express, EJS, PostgreSQL, Redis, Nginx.

## Chạy bằng Docker

1. Sao chép `.env.example` thành `.env`, đổi `POSTGRES_PASSWORD`, `SESSION_SECRET`, `ADMIN_PASSWORD`.
2. Chạy `docker compose up -d --build` (sau lần build đầu có thể dùng `docker compose up -d`).
3. Mở http://localhost:8080. Health check API: http://localhost:8080/api/health.

Compose build image và cài npm dependencies trong Dockerfile; PostgreSQL tự tạo schema rồi service seed chèn 40 sản phẩm máy tính/linh kiện, hai biến thể và ba ảnh mỗi sản phẩm, tài khoản admin cùng ba customer.

Tài khoản demo mặc định (đổi trong `.env` trước khi chạy):

- Admin: `admin@techhub.local` / `Admin123!ChangeMe`
- Customer: `minh.nguyen@example.com` / `Customer123!ChangeMe`

Compose chạy hai bản sao backend qua `deploy.replicas`. Nginx 1.27 tự phân giải địa chỉ service Docker và cân bằng các request API tới backend replicas. Uploads sẽ dùng volume dùng chung ở giai đoạn tính năng upload.

## Kiểm tra thủ công

- `docker compose ps` xác nhận các service đã chạy và có hai container `backend`.
- Mở `/` để xem trang landing page và sản phẩm từ DB.
- Gọi `GET /api/products` và xác nhận có 40 sản phẩm.
- Gọi `GET /api/health` để kiểm tra API.

Schema được khởi tạo trên volume mới. Khi thay đổi schema trong lúc phát triển, thêm migration; file `db/schema.sql` init chỉ tự chạy khi volume PostgreSQL chưa có dữ liệu.
