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

## Ghi chú

- Các diagram phản ánh flow hiện có, không đại diện cho các bảng database chưa có nghiệp vụ.
- Cart, checkout, payment, order, loyalty và admin chưa được đưa vào đây vì chưa có flow hoàn chỉnh trong source.
- Có thể mở từng file bằng Markdown preview trong VS Code để xem hình sequence diagram.

## Chú giải ký hiệu

Mermaid Sequence Diagram trong một số phiên bản VS Code chỉ hỗ trợ ổn định `actor` và `participant`. Vì vậy các diagram dùng `actor` cho người dùng và dùng nhãn vai trò trên `participant` để phân biệt loại đối tượng:

| Nhãn trong diagram | Đối tượng trong project | Ý nghĩa |
|---|---|---|
| `actor` | Customer, Visitor | Người hoặc tác nhân bên ngoài hệ thống |
| `boundary` | Frontend Browser | Biên giao tiếp giữa người dùng và hệ thống |
| `control` | Express API, Controller, Service, Passport, Socket.IO | Thành phần xử lý nghiệp vụ hoặc điều phối |
| `entity` | Google/Facebook, Mailer | Hệ thống hoặc đối tượng bên ngoài được trao đổi dữ liệu |
| `database` | PostgreSQL, Redis | Nơi lưu trữ dữ liệu hoặc session/cache |

Theme của các diagram được cấu hình với đường nối và viền màu đậm `#111827`, nền màu khác nhau theo loại đối tượng để dễ phân biệt khi preview.
