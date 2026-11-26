# TechHub Shop — Bonus và sơ đồ

Mục này tóm tắt các luồng chính trong ứng dụng và các bonus có trong source. Hình nằm trong `diagrams/`; mã PlantUML của các sequence hiện được gom vào `diagrams/sequence-flows.puml`. Sơ đồ giải thích thiết kế, không chứng minh ứng dụng đã chạy.

## Các luồng ứng dụng

| Hình | Luồng | Thành phần source |
|---|---|---|
| [01](diagrams/01-registration.svg) | Đăng ký customer | `source/src/services/auth.js`, `source/src/services/users.js` |
| [02](diagrams/02-login.svg) | Đăng nhập và session | `source/src/config/passport.js`, `source/src/services/auth.js` |
| [03](diagrams/03-logout.svg) | Đăng xuất và hủy session | `source/src/controllers/authController.js` |
| [04](diagrams/04-oauth.svg) | Google/Facebook OAuth | `source/src/config/passport.js` |
| [05](diagrams/05-catalog.svg) | Catalog, tìm kiếm, lọc, sort, phân trang | `source/src/services/catalogService.js`, `source/src/services/searchService.js` |
| [06](diagrams/06-product-detail.svg) | Chi tiết, ảnh và biến thể | `source/src/services/catalogService.js` |
| [07](diagrams/07-review-rating-realtime.svg) | Review, rating và Socket.IO | `source/src/controllers/reviewController.js`, `source/src/app.js` |
| [08](diagrams/08-profile-address.svg) | Hồ sơ và địa chỉ | `source/src/services/users.js` |
| [09](diagrams/09-change-password.svg) | Đổi mật khẩu | `source/src/services/auth.js` |
| [10](diagrams/10-password-recovery.svg) | Khôi phục mật khẩu | `source/src/services/auth.js`, `source/src/services/mailer.js` |
| [11](diagrams/11-cart.svg) | Giỏ guest/customer và gộp giỏ sau đăng nhập | `source/src/services/cartService.js` |
| [12](diagrams/12-checkout-order.svg) | Quote, checkout COD, coupon/loyalty và order | `source/src/services/checkoutService.js`, `source/src/services/orderService.js` |
| [13a](diagrams/13-admin-dashboard.svg), [13b](diagrams/13-admin-products.svg), [13c](diagrams/13-admin-customers.svg), [13d](diagrams/13-admin-orders.svg), [13e](diagrams/13-admin-discounts.svg) | Dashboard và các luồng quản trị tách riêng | `source/src/services/adminService.js`, `source/frontend/public/js/admin.js` |

Mũi tên liền biểu diễn request/lệnh gọi/event; nét đứt là phản hồi. Mỗi nhãn nằm tách khỏi đường mũi tên và nền participant được tô theo stereotype UML. Quan hệ bảng và cardinality nằm riêng trong [ERD](../source/db/ERD.md).

## Bonus có trong source

### 14 — Horizontal scaling với Nginx và Redis

Compose định nghĩa hai tiến trình backend độc lập (`backend-1` và `backend-2`) chạy cùng một ứng dụng Express. Nginx đặt hai tiến trình trong cùng upstream và phân phối request theo round-robin. Cả hai backend dùng chung PostgreSQL cho dữ liệu và Redis cho session; Socket.IO dùng Redis adapter để sự kiện review có thể đi qua nhiều backend. API `/api/instance` trả hostname của tiến trình xử lý request, dùng để quan sát request đã chạm tới replica nào. Đây là một ứng dụng được nhân bản theo chiều ngang, không phải kiến trúc microservices.

Trong repository đã có cấu hình hai backend, upstream Nginx, Redis session và endpoint hostname. Tuy nhiên, cấu hình Compose hiện tại chưa được chạy xác nhận. Hồ sơ chưa có ảnh `docker compose ps` cho hai backend cùng Nginx, cũng chưa có kết quả nhiều request thể hiện cả hai hostname. Để tạo bằng chứng, khởi động toàn bộ Compose, chụp trạng thái các container, gọi `/api/instance` nhiều lần rồi lưu kết quả có cả hai hostname vào `Bonus/evidence/14-scaling-hostnames.png`. Ảnh container dự kiến lưu tại `Bonus/evidence/14-scaling-containers.png`.

### 15 — Elasticsearch cho tìm kiếm sản phẩm

Compose chạy Elasticsearch single-node trong mạng nội bộ. Khi backend khởi động, search service tạo index sản phẩm và đồng bộ dữ liệu; khi admin thêm, sửa hoặc xóa sản phẩm, index cũng được cập nhật. Với truy vấn tìm kiếm, ứng dụng lấy danh sách sản phẩm phù hợp từ Elasticsearch, sau đó dùng PostgreSQL để lấy dữ liệu hiển thị và áp dụng các bộ lọc, trạng thái, giá, danh mục cùng phân trang. Nếu Elasticsearch chưa sẵn sàng, ứng dụng chuyển sang tìm kiếm PostgreSQL để catalog vẫn dùng được. Elasticsearch không mở cổng trực tiếp ra máy host.

Source có cấu hình dịch vụ, đồng bộ index, cập nhật index và nhánh fallback. Chưa có bằng chứng runtime từ Compose hiện tại: chưa lưu trạng thái container, log đồng bộ, số document trong index hoặc kết quả tìm kiếm qua API/UI. Sau khi khởi động, lưu ảnh trạng thái container vào `Bonus/evidence/15-elasticsearch-containers.png`, log đồng bộ vào `Bonus/evidence/15-elasticsearch-sync.png`, kết quả tìm kiếm vào `Bonus/evidence/15-elasticsearch-search.png`; thử sửa tên sản phẩm rồi tìm lại để chứng minh index được cập nhật. Chỉ ghi số document thực tế quan sát được.

### 16 — GitHub Actions kiểm tra và publish image

Workflow chạy khi có pull request hoặc push lên nhánh `main`. Job `checks` cài dependency, chạy kiểm tra source, xác thực cấu hình Docker Compose và build Docker image. Khi push lên `main` và các bước kiểm tra thành công, job `publish` đăng nhập GHCR bằng `GITHUB_TOKEN` rồi đẩy image với tag `latest` và tag theo SHA của commit. Workflow không chứa secret OAuth, SMTP hoặc token tự tạo.

File workflow đã có trong repository, nhưng chưa có lần chạy GitHub Actions thành công được xác nhận và chưa xác nhận package thực sự xuất hiện trên GHCR. Sau khi push workflow lên GitHub, cần lưu ảnh run xanh thể hiện cả `checks` và `publish` vào `Bonus/evidence/16-github-actions.png`, rồi mở Packages để kiểm tra và chụp image có tag SHA cùng `latest` vào `Bonus/evidence/16-ghcr-package.png`. Nếu chưa có package thật thì không ghi nhận bước publish đã hoàn tất.

Các mô tả và cấu hình trên cho thấy cách triển khai trong source; chúng không thay thế bằng chứng chạy thực tế. Hiện thư mục chưa có ảnh/log runtime cho ba bonus. Chỉ bổ sung bằng chứng sau khi tự chạy và quan sát kết quả thật.

Hai backend là cùng ứng dụng Express chạy thành hai replica; source hiện không phải kiến trúc microservices. Checkout hiện là COD, chưa có payment gateway. Admin chưa có CRUD danh mục và dashboard chưa thống kê loại/số lượng sản phẩm đã bán theo kỳ; xem các khoảng trống này khi tự chấm rubric.

## Hồ sơ demo và nộp bài

- [Kịch bản demo](demo-script.md) sắp xếp thao tác theo rubric; chỉ trình bày chức năng chạy được.
- [Checklist nộp bài](checklist-nop-bai.md) nêu các file và bằng chứng cần bổ sung.
- Chỉ để ảnh chụp runtime/GitHub thật trong gói nộp. Hiện chưa có `demo.mp4`, ảnh GitHub teamwork hoặc bằng chứng runtime mới cho scaling, Elasticsearch và CI/CD.
