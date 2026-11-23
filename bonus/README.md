# TechHub Shop - Sequence Diagrams

Thư mục này chứa các sequence diagram cho những luồng đã có trong source code hiện tại.

## Danh sách luồng

| File | Luồng | Trạng thái |
|---|---|---|
| `01-registration.md` | Đăng ký customer | Hoàn thiện |
| `02-login.md` | Đăng nhập bằng email/mật khẩu | Hoàn thiện |
| `03-logout.md` | Đăng xuất và hủy session | Hoàn thiện |
| `04-oauth.md` | Đăng nhập Google/Facebook | Có code, cần credentials |
| `05-catalog.md` | Catalog, tìm kiếm, filter, sort, pagination | Hoàn thiện |
| `06-product-detail.md` | Chi tiết sản phẩm, ảnh và variants | Hoàn thiện |
| `07-review-rating-realtime.md` | Comment, rating và cập nhật Socket.IO | Có code, cần kiểm tra realtime |
| `08-profile-address.md` | Hồ sơ và nhiều địa chỉ giao hàng | Hoàn thiện |
| `09-change-password.md` | Đổi mật khẩu | Hoàn thiện |
| `10-password-recovery.md` | Khôi phục mật khẩu | Hoàn thiện khi cấu hình SMTP hoặc xem log local |
| `11-cart.md` | Cart khách và customer, gộp cart sau đăng nhập | Đã có API/UI; cần xác nhận end-to-end |
| `12-checkout-order.md` | Quote, địa chỉ, coupon, loyalty, tạo đơn COD, email và lịch sử đơn | Đã có API/UI; email cần SMTP |
| `13-admin.md` | Dashboard, analytics, quản lý sản phẩm/customer/order/discount | Đã có API/UI; cần xác nhận quyền và thao tác end-to-end |

## Ghi chú

- Các diagram phản ánh flow hiện có, không đại diện cho các bảng database chưa có nghiệp vụ.
- Sequence 11–13 ghi lại cart, checkout/order và module quản trị hiện có. Payment gateway chưa có trong source.
- Mỗi file luồng có ảnh SVG được nhúng trực tiếp nên hiển thị ngay trong Markdown preview/GitHub; mở `PlantUML source` bên dưới ảnh để xem hoặc sửa mã nguồn.

## Chú giải participant

Các sequence diagram dùng PlantUML. Mỗi ô participant được tô nền theo đúng stereotype UML; actor cũng có màu riêng. Các loại chính:

| Kiểu UML | Màu nền | Dùng cho |
|---|---|---|
| `actor` | Xanh lam nhạt | Customer, Guest, Visitor, Admin |
| `boundary` | Xanh dương | Browser hoặc giao diện frontend |
| `control` | Xanh lá | API, controller, service, Passport, Socket.IO |
| `database` | Tím nhạt | PostgreSQL, Redis, session và rate limit |
| `entity` | Đỏ nhạt | Google/Facebook, mailer và dịch vụ ngoài |

Màu phủ toàn bộ ô participant tương ứng. Mũi tên nét liền là lời gọi/sự kiện chủ động; mũi tên nét đứt là phản hồi. Lời gọi participant tới chính nó dùng nét vòng quay lại. Mỗi trang nhúng sẵn SVG để Markdown preview hiển thị ngay; mã PlantUML có thể mở bên dưới sơ đồ.