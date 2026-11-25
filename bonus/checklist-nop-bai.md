# Checklist nộp đồ án

## Thư mục và mã nguồn

- [ ] Đổi tên thư mục nộp đúng mẫu `id1_hoten1_id2_hoten2` (nhóm 3 người thêm `_id3_hoten3` theo yêu cầu giảng viên).
- [ ] Bao gồm source, `README.txt`, `README.md`, `Bảng tự đánh giá cho Rubrik.docx`, `bonus/`, `db/`, Dockerfile, Compose, Nginx và `.env.example`.
- [ ] Không chép `node_modules/`, `.git/` nếu giảng viên không yêu cầu, log build, file dump database hoặc volume dữ liệu.
- [ ] Giữ `.env` trên máy chạy; không đưa `.env`, mật khẩu thật, OAuth secret, SMTP password hoặc GitHub token vào thư mục nộp hay commit.
- [ ] Chạy `git status --short` và rà các file cần commit; kiểm tra `.gitignore` có `.env` và `node_modules/`.
- [ ] Push toàn bộ commit lên GitHub; mở GitHub để xác nhận README, workflow và lịch sử commit hiển thị.
- [ ] Nếu giảng viên yêu cầu đóng gói ZIP, tạo ZIP từ thư mục đã clean và thử giải nén vào vị trí khác.

## Chạy trên máy trình diễn

- [ ] Docker Desktop đang chạy và Compose v2 hoạt động.
- [ ] Tạo `.env` từ `.env.example`; dùng credential local, không dùng secret production.
- [ ] Chạy đúng `docker compose up -d`; chờ migration, seed, frontend, hai backend, Nginx, Redis, PostgreSQL và Elasticsearch khởi động.
- [ ] Chạy `docker compose ps`; chụp vào `evidence/01-compose-ps.png`.
- [ ] Mở `http://localhost:8080` và `http://localhost:8080/admin`; thử đăng nhập các tài khoản demo.
- [ ] Kiểm tra `docker compose logs --tail=50 migrate seed backend-1 backend-2 elasticsearch`.
- [ ] Kiểm tra endpoint hostname và Elasticsearch theo `bonus/14-scaling.md` và `bonus/15-elasticsearch.md`.
- [ ] Nếu một feature không chạy được, đổi mức tự đánh giá về 0 hoặc 1/2 phù hợp; bỏ feature đó khỏi đoạn “đã hoàn thành” trong video.

## Bằng chứng hình ảnh/video

- [ ] Chụp màn hình storefront, catalog/filter/pagination, product detail/variants, cart, checkout, lịch sử đơn, admin và responsive sau khi thao tác thật.
- [ ] Chụp test validation/security bằng dữ liệu an toàn; không để email, địa chỉ hoặc secret thật của cá nhân trong ảnh.
- [ ] Chụp hai hostname backend và GitHub Actions/GHCR; chưa có ảnh thì không đánh dấu bonus đã xác minh.
- [ ] Quay `demo.mp4` ở 1920×1080, âm thanh rõ, theo `bonus/demo-script.md`; dùng dữ liệu demo và không giải thích lý thuyết.
- [ ] Mở video đầu/cuối để đảm bảo file không lỗi; đặt đúng tên `demo.mp4` nếu rubric yêu cầu.

## GitHub screenshots

- [ ] Screenshot repository trang đầu (tên repository và README).
- [ ] Screenshot tab commits có đóng góp của từng thành viên theo yêu cầu môn học.
- [ ] Screenshot tab Actions có run thành công nếu tính CI/CD bonus.
- [ ] Screenshot GHCR package/tag nếu tính bước publish.
- [ ] Không chụp `.env`, password, credential reset token hay secret trong terminal.

## Rà soát cuối

- [ ] Tên file đúng chính tả và mở được trên máy khác.
- [ ] README hướng dẫn một lệnh chạy, URL, tài khoản seed, cấu hình optional và bonus đúng trạng thái.
- [ ] Rubric DOCX chỉ dùng bằng chứng thật, không cộng điểm cho source chưa chạy.
- [ ] Cả nhóm giữ bản sao backup ZIP và URL repository.
