# TECHHUB SHOP

Website thương mại điện tử bán **máy tính và linh kiện máy tính** cho môn Web Programming with Node.js.

> Trạng thái của tài liệu này: cập nhật theo source code hiện tại. Các chức năng chưa có route, controller, service và giao diện tương ứng được đánh dấu là **Chưa hoàn thành**, không được xem là đã triển khai.

## 1. Thông tin dự án

+------------------+--------------------------------------------------------------+
| Hạng mục         | Thông tin                                                    |
+------------------+--------------------------------------------------------------+
| Backend          | Node.js, Express.js                                          |
| Frontend         | EJS, JavaScript thuần, Bootstrap 5                          |
| Database         | PostgreSQL                                                   |
| Session/cache    | Redis                                                        |
| Realtime         | Socket.IO và Redis adapter                                   |
| Reverse proxy    | Nginx                                                        |
| Đóng gói         | Docker Compose                                               |
| Cổng truy cập    | http://localhost:8080                                       |
| API health check | http://localhost:8080/api/health                            |
| Public URL       | Chưa triển khai public; chỉ có môi trường Docker local       |
+------------------+--------------------------------------------------------------+

## 2. Yêu cầu môi trường

- Windows, macOS hoặc Linux.
- Docker Desktop có Docker Compose v2.
- Có thể kiểm tra bằng:

```bash
docker --version
docker compose version
```

Không cần cài Node.js, PostgreSQL hoặc Redis trực tiếp trên máy nếu chạy bằng Docker Compose.

## 3. Cách chạy cho giảng viên

### Lần chạy đầu tiên

Mở terminal tại thư mục chứa file này:

```bash
cd techhub-shop
copy .env.example .env
docker compose up -d --build
```

Trên macOS/Linux, dùng:

```bash
cp .env.example .env
docker compose up -d --build
```

Sau khi các container healthy, mở:

```text
http://localhost:8080
```

### Những lần chạy tiếp theo

```bash
docker compose up -d
```

Lưu ý: image chưa được đóng gói sẵn trong repository, vì vậy lần đầu bắt buộc dùng `--build`. Đây là điểm cần hoàn thiện nếu muốn đáp ứng tuyệt đối yêu cầu chỉ chạy một lệnh `docker compose up -d` trên máy giảng viên.

### Kiểm tra trạng thái

```bash
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
docker compose logs --tail=100 migrate
docker compose logs --tail=100 seed
```

Health check:

```text
http://localhost:8080/health
http://localhost:8080/api/health
```

## 4. Tài khoản dùng để đánh giá

Các tài khoản được tạo bởi service seed trên database mới:

+---------------+------------------------------+------------------------+----------------------------------------------+
| Vai trò       | Email                        | Mật khẩu               | Trạng thái                                   |
+---------------+------------------------------+------------------------+----------------------------------------------+
| Administrator | admin@techhub.local          | Admin123!ChangeMe      | Có account, giao diện admin chưa hoàn thành  |
| Customer      | minh.nguyen@example.com      | Customer123!ChangeMe   | Có dữ liệu địa chỉ mẫu                       |
| Customer      | linh.tran@example.com        | Customer123!ChangeMe   | Có dữ liệu địa chỉ mẫu                       |
| Customer      | khoa.le@example.com          | Customer123!ChangeMe   | Có dữ liệu địa chỉ mẫu                       |
+---------------+------------------------------+------------------------+----------------------------------------------+

Đây là thông tin local mặc định để chấm bài. Không dùng các mật khẩu mặc định này khi public deployment. Có thể đổi qua `.env`:

```env
ADMIN_EMAIL=admin@techhub.local
ADMIN_PASSWORD=thay-bang-mat-khau-moi
SESSION_SECRET=thay-bang-chuoi-ngau-nhien-dai
```

## 5. Các đường dẫn chính

### Giao diện

+----------------------------+--------------------------------------------------------------+
| URL                        | Mục đích                                                     |
+----------------------------+--------------------------------------------------------------+
| /                          | Landing page: sản phẩm mới, bán chạy và danh mục             |
| /products                  | Catalog sản phẩm                                             |
| /categories/:slug          | Catalog theo danh mục                                        |
| /search?q=...              | Tìm kiếm sản phẩm                                            |
| /products/:slug            | Chi tiết, variants, ảnh, review, rating                      |
| /register                  | Đăng ký customer                                             |
| /login                     | Đăng nhập và OAuth nếu đã cấu hình                           |
| /forgot-password           | Yêu cầu khôi phục mật khẩu                                   |
| /reset-password?token=...  | Đặt mật khẩu mới                                             |
| /account                  |  Hồ sơ, mật khẩu và địa chỉ giao hàng                         |
+----------------------------+--------------------------------------------------------------+

### API catalog và review

+--------+-----------------------------+----------------------------------------------+
| Method | Endpoint                    | Mục đích                                     |
+--------+-----------------------------+----------------------------------------------+
| GET    | /api/products               | Pagination, search, filter, sort             |
| GET    | /api/products/new           | Sản phẩm mới                                 |
| GET    | /api/products/best-sellers  | Sản phẩm bán chạy                            |
| GET    | /api/products/:slug         | Chi tiết sản phẩm                            |
| GET    | /api/categories             | Danh mục                                     |
| GET    | /api/brands                 | Thương hiệu                                  |
| GET    | /api/products/:id/reviews   | Danh sách bình luận                          |
| POST   | /api/products/:id/reviews   | Comment, không bắt buộc login                |
| POST   | /api/products/:id/ratings   | Rating 1-5 sao, bắt buộc customer login      |
+--------+-----------------------------+----------------------------------------------+

Catalog hỗ trợ các query chính: `page`, `limit`, `q`, `category`, `brand`, `minPrice`, `maxPrice`, `inStock`, `sort`.

Các giá trị `sort`: `name_asc`, `name_desc`, `price_asc`, `price_desc`, `newest`, `best_sellers`.

## 6. Hướng dẫn kiểm tra chức năng hiện có

- [x] Mở landing page và xem nhóm sản phẩm mới.
- [x] Mở nhóm sản phẩm bán chạy.
- [x] Mở danh mục sản phẩm.
- [x] Mở catalog và chuyển trang.
- [x] Tìm kiếm theo keyword.
- [x] Lọc theo category, brand, khoảng giá và tình trạng tồn kho.
- [x] Sắp xếp theo tên, giá, mới nhất và bán chạy.
- [x] Mở product detail.
- [x] Kiểm tra ít nhất 3 ảnh và 2 variants của sản phẩm.
- [x] Gửi comment khi chưa đăng nhập.
- [x] Đăng nhập customer và gửi rating sao.
- [x] Đăng ký, đăng nhập và đăng xuất.
- [x] Cập nhật tên tài khoản.
- [x] Thêm, sửa, xóa và đổi địa chỉ mặc định.
- [x] Đổi mật khẩu.
- [x] Yêu cầu khôi phục mật khẩu.
- [x] Kiểm tra CSRF, session Redis và rate limit.
- [ ] Thêm sản phẩm vào cart.
- [ ] Cập nhật hoặc xóa cart item.
- [ ] Guest checkout.
- [ ] Payment và tạo order.
- [ ] Order history và order tracking.
- [ ] Email xác nhận order.
- [ ] Discount code khi checkout.
- [ ] Loyalty point.
- [ ] Admin dashboard.
- [ ] Admin product/user/order management.
- [ ] Admin discount management.

## 7. Tiến độ theo rubric

+--------------------------------+---------+-----------------------------------------------+
| Nhóm yêu cầu                   | Tiến độ | Ghi chú                                       |
+--------------------------------+---------+-----------------------------------------------+
| Social media authentication    | 70%     | OAuth có khung, cần credentials/callback      |
| Profile và change password     | 100%    | Đã có API và giao diện                        |
| Password recovery              | 90%     | Cần SMTP hoặc xem token trong log local       |
| Multiple delivery addresses    | 100%    | Thêm, sửa, xóa, đặt default                   |
| Purchase history/details       | 0%      | Chưa có order flow                            |
| Landing page                   | 100%    | New, best sellers và nhiều danh mục           |
| Product catalog                | 100%    | Pagination, filter, search, sort              |
| Product detail/variants        | 100%    | 40 sản phẩm, 2 variants, 3 ảnh mỗi sản phẩm   |
| Cart                           | 0%      | Chưa có route và UI                           |
| Checkout/payment               | 0%      | Chưa triển khai                               |
| Discount                       | 0%      | Có schema, chưa có nghiệp vụ                  |
| Email sau order                | 0%      | Hàm confirmation chưa có logic                |
| Comment/rating                 | 80%     | Có API/Socket.IO, cần kiểm tra realtime       |
| Loyalty                        | 0%      | Có schema, chưa có tính điểm                  |
| Admin                          | 0%      | Có account, chưa có admin module              |
| UI/UX/responsive               | 70%     | Bootstrap và responsive cơ bản                |
| Docker deployment              | 80%     | Chạy local sau build                          |
| Horizontal scaling             | 40%     | Có Redis/Nginx, chưa chứng minh replicas      |
+--------------------------------+---------+-----------------------------------------------+

### Sơ đồ tiến độ theo luồng

```mermaid
flowchart TD
    A[Docker Compose] --> B[Database schema]
    A --> C[Redis session]
    A --> D[Nginx]
    B --> E[Seed data]
    E --> F[Catalog]
    E --> G[Authentication]
    E --> H[Profile and addresses]
    F --> I[Search filter sort pagination]
    F --> J[Product detail variants images]
    J --> K[Comment and rating]
    K --> L[Socket.IO realtime]
    H --> M[Password recovery]
    M --> N[SMTP email]
    F -. missing .-> O[Cart]
    O -. missing .-> P[Checkout and payment]
    P -. missing .-> Q[Orders and tracking]
    Q -. missing .-> R[Order email]
    Q -. missing .-> S[Loyalty points]
    Q -. missing .-> T[Admin dashboard]
    T -. missing .-> U[Admin product user order discount]
```

Luồng nét liền là phần đang có trong source. Luồng nét đứt là phần cần triển khai để đạt đầy đủ rubric.

## 8. Cấu hình OAuth và email

### Google/Facebook OAuth

Thêm thông tin vào `.env`, sau đó rebuild:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
BASE_URL=http://localhost:8080
```

Callback URL cần đăng ký:

```text
http://localhost:8080/api/auth/google/callback
http://localhost:8080/api/auth/facebook/callback
```

Kiểm tra provider:

```text
http://localhost:8080/api/auth/providers
```

### Password recovery email

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=TechHub <no-reply@techhub.local>
```

Nếu không cấu hình SMTP trong môi trường development, reset link chỉ được ghi trong log backend. Không dùng cách này cho production.

## 9. Xử lý lỗi thường gặp

### Container không khởi động

```bash
docker compose ps
docker compose logs --tail=200 db
docker compose logs --tail=200 migrate
docker compose logs --tail=200 seed
```

Kiểm tra `.env` có `POSTGRES_PASSWORD`, `SESSION_SECRET` và thông tin database hợp lệ.

### Database bị lỗi do volume cũ

`db/schema.sql` chỉ tự chạy khi PostgreSQL volume mới. Khi phát triển schema, cần migration. Nếu dữ liệu local không cần giữ, reset toàn bộ volume:

```bash
docker compose down -v
docker compose up -d --build
```

Lệnh trên xóa dữ liệu PostgreSQL và Redis local.

### Seed thất bại do dữ liệu cũ

```bash
docker compose logs seed
docker compose run --rm seed
```

Nếu lỗi liên quan đến dữ liệu cũ, xem xét reset volume bằng quy trình ở trên.

### Không truy cập được website

```bash
docker compose ps
docker compose logs --tail=100 nginx
docker compose logs --tail=100 frontend
curl http://localhost:8080/health
curl http://localhost:8080/api/health
```

Nếu cổng `8080` đang được sử dụng, đổi mapping trong `docker-compose.yml`, ví dụ `8081:80`, rồi mở `http://localhost:8081` và cập nhật `BASE_URL` tương ứng.

### Login hoặc request POST trả về lỗi CSRF

- Tải lại trang login/account.
- Xóa cookie site local nếu session cũ bị hỏng.
- Đảm bảo frontend và API đều được truy cập qua cùng host `localhost:8080`.
- Không gọi trực tiếp frontend ở cổng `3001` rồi gọi API qua host khác khi kiểm tra CSRF.

### OAuth không hiện nút đăng nhập

Kiểm tra `/api/auth/providers`. Nếu giá trị provider là `false`, kiểm tra Client ID/Secret, callback URL và rebuild backend.

### Không thấy reset link

```bash
docker compose logs backend
```

Chỉ development mới ghi reset link vào log khi chưa cấu hình SMTP.

## 10. Cấu trúc source

```text
src/
  app.js                 Express middleware và route registration
  server.js              HTTP server và Socket.IO
  config/                PostgreSQL, Redis, Passport
  controllers/           Xử lý request/response
  middleware/            Auth, CSRF, rate limit
  routes/                Auth, profile, catalog routes
  services/              Auth, users, catalog, validation, mailer
frontend/
  server.js              EJS server và page routes
  views/                 Các trang giao diện
  public/                CSS và JavaScript frontend
db/schema.sql            PostgreSQL schema
db/ERD.md                Sơ đồ ERD và quan hệ dữ liệu hiện tại
scripts/migrate.js       Migration bổ sung
scripts/seed.js          Dữ liệu demo
nginx/default.conf       Reverse proxy và Socket.IO proxy
docker-compose.yml       Các service local
Dockerfile               Node.js image
```

## 11. Ghi chú trung thực khi đánh giá

- Project hiện chỉ bán máy tính và linh kiện máy tính; seed không có điện thoại hoặc sản phẩm ngoài phạm vi đề.
- Schema đã chuẩn bị nhiều bảng cho cart, order, discount và loyalty, nhưng schema một mình chưa tạo thành chức năng hoàn chỉnh.
- Tài khoản admin đã được seed nhưng chưa có giao diện hoặc API admin tương ứng.
- Chưa có public URL.
- Chưa có payment gateway.
- Chưa có video demo, thư mục ảnh GitHub Insights hoặc file tự đánh giá rubric trong repository này; các nội dung này cần chuẩn bị riêng khi nộp bài.
- Không khai báo bonus feature nào là đã hoàn thành. CI/CD, microservices, AI chatbot/image search/sentiment analysis và Elasticsearch hiện chưa được triển khai.

## 12. Thứ tự triển khai tiếp theo

```text
[1] Cart và guest cart
	|
	v
[2] Checkout + địa chỉ + discount + loyalty
	|
	v
[3] Transaction tạo order + trừ inventory
	|
	v
[4] Email xác nhận + order history + tracking
	|
	v
[5] Admin order/product/user/discount
	|
	v
[6] Simple dashboard + advanced dashboard
	|
	v
[7] Fix realtime review + test end-to-end
	|
	v
[8] Docker acceptance test bằng môi trường sạch
```

Mỗi bước chỉ được đánh dấu hoàn thành sau khi có route, giao diện, database transaction cần thiết và kiểm tra thực tế trong Docker.
