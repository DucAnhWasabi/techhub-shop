# Bonus: GitHub Actions CI và publish image

## Workflow trong source

File `.github/workflows/ci-cd.yml` ở root repository chạy khi có pull request hoặc push lên `main`; workflow cài dependency và build ứng dụng trong `source/`:

- Job `checks`: cài dependency, chạy `npm run check`, kiểm tra Docker Compose và build Docker image.
- Job `publish`: chỉ chạy sau `checks` thành công khi push lên `main`; đăng nhập GHCR bằng `GITHUB_TOKEN` rồi publish image có tag `latest` và SHA.
- Workflow không chứa credential OAuth, SMTP hay token thủ công.

## Trạng thái bằng chứng

Workflow đã có trong source nhưng **chưa được chạy trên GitHub trong hồ sơ hiện tại**. Chưa có ảnh xanh từ tab Actions và chưa xác nhận package xuất hiện trên GHCR.

## Chạy và chụp bằng chứng

1. Commit và push workflow lên repository GitHub.
2. Mở tab **Actions**, chọn workflow **CI and publish Docker image**, chờ job hoàn tất.
3. Chụp trang run thể hiện cả `checks` và `publish` thành công vào `evidence/16-github-actions.png`.
4. Mở **Packages** của repository, xác nhận image `techhub-shop` có tag SHA và `latest`; chụp vào `evidence/16-ghcr-package.png`.
5. Không chụp/đưa token, `.env` hoặc secret ra ảnh demo.

Nếu `publish` không chạy sau push, kiểm tra branch là `main` và workflow đã được GitHub nhận. Nếu lỗi quyền GHCR, kiểm tra quyền `packages: write` và Actions permission của repository.
