# Kịch bản quay `demo.mp4` (1080p)

**Thiết lập hình:** 1920×1080, trình duyệt toàn màn hình, zoom 90–100%, ẩn notification và profile cá nhân, không để `.env` hoặc terminal có secret trên màn hình. Quay thao tác thật, không đọc/giải thích lý thuyết. Các đoạn đánh dấu “nếu cấu hình” chỉ quay khi cấu hình hoạt động; nếu không, bỏ đoạn và không tự đánh giá mục đó là đã hoàn thành.

## 0:00–0:30 — Khởi động

1. Mở PowerShell tại thư mục project.
2. Chạy `docker compose up -d`.
3. Chạy `docker compose ps`; lia qua frontend, nginx, db, redis, migrate/seed, `backend-1`, `backend-2`, Elasticsearch.
4. Mở `http://localhost:8080`.

## 0:30–2:00 — Landing và catalog

1. Cuộn qua New Products, Best Sellers, các category.
2. Mở `/products`; lần lượt chuyển grid/list nếu nút có, bấm pagination kể cả khi chỉ có một trang.
3. Chọn brand, min/max price, tiêu chí lọc thứ ba; áp dụng và xóa filter.
4. Tìm tên sản phẩm; đổi sort name A–Z, Z–A, giá tăng, giá giảm.
5. Chỉ vào giá hiển thị và các card có tên, giá, ảnh, mô tả.

## 2:00–3:15 — Chi tiết, biến thể, comment và rating

1. Mở một sản phẩm máy tính/linh kiện.
2. Chuyển ít nhất ba ảnh; đọc brand/mô tả; chọn hai biến thể lần lượt và cho thấy tồn kho/giá đổi.
3. Đăng comment khi chưa login.
4. Mở cùng sản phẩm ở cửa sổ thứ hai; submit rating bằng customer đã đăng nhập, quan sát cập nhật ở cửa sổ còn lại nếu realtime đang hoạt động.

## 3:15–4:30 — Customer và địa chỉ

1. Mở `/register`, tạo customer bằng email riêng cho demo, họ tên và địa chỉ.
2. Đăng xuất rồi đăng nhập lại.
3. Mở `/account`, sửa hồ sơ, thêm địa chỉ thứ hai, đặt default, sửa/xóa địa chỉ phụ.
4. Đổi mật khẩu rồi đăng nhập lại bằng mật khẩu mới.
5. Yêu cầu reset tại `/forgot-password`; dùng email link hoặc link trong log local. Không hiện token trong screenshot.
6. Nếu Google/Facebook credentials đã cấu hình: thử provider thật và quay callback thành công.

## 4:30–6:30 — Giỏ, coupon, guest checkout và loyalty

1. Đăng xuất, thêm hai sản phẩm/variants vào guest cart.
2. Tăng/giảm số lượng rồi xóa một item; cho thấy tổng, thuế và phí vận chuyển đổi không reload.
3. Đăng nhập customer, xác nhận cart guest được gộp nếu hoạt động.
4. Mở checkout; đi lần lượt từng bước, thử coupon `TECH5`, xem mức giảm/quote trước khi xác nhận.
5. Đặt một đơn test COD. Dùng tài khoản customer nếu muốn minh họa tích điểm; giữ order number để mở lịch sử sau.
6. Mở `/orders`, vào order detail, cuộn lịch sử trạng thái.
7. Với điểm đã nhận, tạo quote đơn kế tiếp và cho thấy điểm được áp dụng ngay.
8. Nếu SMTP cấu hình: trình bày thư xác nhận trong mailbox demo.

## 6:30–9:30 — Admin theo thứ tự rubric

1. Đăng nhập tài khoản admin; mở `/admin`.
2. Dashboard cơ bản: tổng customer, user mới, số đơn, doanh thu, best seller chart.
3. Dashboard nâng cao: năm → quý → tháng → tuần → khoảng ngày; cho thấy so sánh kỳ, đơn/doanh thu/lợi nhuận.
4. Products: tạo sản phẩm demo với ít nhất hai dòng biến thể UI, tồn kho riêng và ba URL ảnh; sửa tồn/giá rồi xóa sản phẩm demo.
5. Users: tìm customer, sửa tên/email demo, khóa rồi mở lại tài khoản.
6. Orders: lọc hôm nay/hôm qua/tuần/tháng/khoảng ngày; mở detail, xem status history, đổi status.
7. Discounts: tạo mã 5 ký tự, xem ngày tạo, mức giảm, used/max và các order áp dụng.

## 9:30–10:30 — Bảo mật, responsive, scaling và bonus

1. Thử gửi form thiếu/không hợp lệ để hiện client/server validation; thử gọi trang admin bằng customer và quay kết quả từ chối.
2. Chuyển DevTools responsive mobile, quay catalog/cart có thể sử dụng trên viewport nhỏ.
3. Trong PowerShell chạy `1..10 | ForEach-Object { (Invoke-RestMethod http://localhost:8080/api/instance).hostname } | Group-Object`; giữ kết quả có hai hostname.
4. Tìm sản phẩm `Invoke-RestMethod 'http://localhost:8080/api/products?q=ThinkCore'`; cho thấy kết quả. Kiểm tra log sync Elasticsearch.
5. Nếu workflow đã chạy: mở GitHub Actions run xanh và package GHCR. Không đưa credential lên video.
6. Kết thúc ở trang chủ; dừng capture.

## Quy tắc cắt video

- Không chèn giải thích kiến trúc, slide hay mockup.
- Có thể tăng tốc thao tác chờ, nhưng không cắt bỏ trạng thái kết quả.
- Nếu một mục fail, không ghép ảnh/log khác để thay; ghi mục đó chưa xác nhận và sửa DOCX tương ứng.
- Tổng thời lượng dự kiến 10–12 phút; giữ đủ thao tác và kết quả cho mọi mục được chấm.
