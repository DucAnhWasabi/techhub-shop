# Checklist hoàn thiện hồ sơ nộp

Đề yêu cầu thư mục nộp theo mẫu mã sinh viên và họ tên thành viên (`id1_hoten1_id2_hoten2...`). Không đổi cấu trúc repository đang phát triển; tạo thư mục đóng gói riêng sau khi các mục bên dưới đã sẵn sàng.

## Gói nộp

- [ ] Tạo thư mục đúng quy cách đặt tên theo hướng dẫn giảng viên.
- [x] Mã nguồn, database, Dockerfile và Compose được đặt trong `source/`; không đưa `.env`, secret, `node_modules`, log hoặc dữ liệu volume vào gói.
- [x] Đặt `Readme.txt` ở gốc gói. Ghi lệnh chạy, URL, tài khoản seed và cấu hình tùy chọn chính xác.
- [x] Đặt file tự đánh giá `Rubrik.docx` ở gốc; chỉ ghi điểm có bằng chứng thực tế.
- [x] Có thư mục `Bonus/` chứa mô tả bonus, sơ đồ và hướng dẫn lưu minh chứng; ảnh/log runtime còn thiếu được ghi rõ.
- [ ] Quay `demo.mp4` độ phân giải 1920×1080, hình/âm thanh rõ, thao tác trực tiếp theo `demo-script.md`; không thay bằng sơ đồ hoặc phần thuyết trình lý thuyết.
- [ ] Lưu ảnh repository/GitHub Insights và lịch sử commit thể hiện đóng góp cân bằng, hợp tác chủ động, commit sớm/đều; thời gian từ lúc bắt đầu đến hiện tại ít nhất 1 tháng và mỗi thành viên có ít nhất 2 commit mỗi tuần. Bố cục và danh sách ảnh: `git/HUONG-DAN.txt`.
- [ ] Nếu nộp ZIP, thử giải nén gói và chạy theo đúng hướng dẫn trong Readme.txt.

## Chạy và chụp minh chứng

- [ ] Tạo `source/.env` từ `source/.env.example` với credential demo; từ thư mục `source/` chạy `docker compose up -d` theo yêu cầu đề.
- [ ] Lưu `docker compose ps`, health endpoint, storefront và trang admin sau khi khởi động thành công.
- [ ] Quay các mục rubric theo thứ tự trong `demo-script.md`: landing, catalog, filters/sort/paging, chi tiết, variants, review/rating, giỏ, checkout, lịch sử và quản trị.
- [ ] Kiểm tra desktop và mobile; dùng ảnh sản phẩm thật thay các ảnh placeholder trong seed trước khi quay.
- [ ] Kiểm tra email/OAuth chỉ khi cấu hình SMTP/OAuth thật; ghi rõ nếu không có cấu hình.
- [ ] Scaling: dùng `/api/instance` để ghi nhận hostname của cả hai backend; ảnh `docker compose ps` một mình chưa chứng minh round-robin.
- [ ] Elasticsearch: lưu log sync index và kết quả tìm kiếm từ ứng dụng. Không dùng cấu hình source làm bằng chứng runtime.
- [ ] CI/CD: lưu run thành công trong GitHub Actions; chỉ ghi nhận publish nếu package thật xuất hiện trên GHCR.
- [ ] Không ghi nhận payment gateway, quản trị danh mục, dashboard thống kê loại/số lượng sản phẩm theo kỳ nếu các phần đó chưa được bổ sung và kiểm tra.

## Rà soát trước khi nộp

- [ ] So nội dung video, Readme.txt, DOCX và ảnh minh chứng để chúng cùng phản ánh trạng thái thật.
- [ ] Bảo đảm không đưa credential thật, token reset, `.env` hoặc thông tin cá nhân vào ảnh/video/gói nộp.
- [ ] Kiểm tra tên file mở được trên máy khác; xác nhận ZIP không chứa thư mục thừa hoặc dump database.
- [ ] Lưu bản sao gói cuối và URL repository.

Tại lần rà soát tài liệu ngày 26/11/2026, repo chưa có `demo.mp4`, ảnh teamwork trong `git/`, ảnh/log runtime Compose giai đoạn hiện tại hoặc thư mục đóng gói theo ID thành viên. Folder `git/` đang trống. Các mục này cần được tạo từ thao tác thật trước hạn nộp.
