# Bonus: Elasticsearch cho tìm kiếm sản phẩm

## Thiết kế trong source

- `source/docker-compose.yml` có service Elasticsearch single-node, chỉ expose trên network nội bộ.
- `source/src/services/searchService.js` tạo index `techhub-products`, đồng bộ sản phẩm khi backend khởi động và cập nhật index khi admin thêm/sửa/xóa sản phẩm.
- `source/src/services/catalogService.js` lấy product IDs từ Elasticsearch rồi dùng PostgreSQL để áp dụng trạng thái, brand, category, khoảng giá và phân trang.
- Nếu Elasticsearch chưa sẵn sàng, search service trả về PostgreSQL fallback để trang catalog vẫn truy cập được.

## Trạng thái bằng chứng

**Chưa xác nhận runtime.** Sau khi thêm Elasticsearch vào Compose, Docker Engine không khởi động được trên máy phát triển. Chưa có log `Elasticsearch: đã đồng bộ ...` hoặc kết quả tìm kiếm được chụp từ container đang chạy.

## Chạy và chụp bằng chứng

1. Từ thư mục repository chạy `cd source; docker compose up -d` rồi chờ service khởi động.
2. Chụp `docker compose ps elasticsearch backend-1 backend-2` vào `evidence/15-elasticsearch-containers.png`.
3. Kiểm tra log đồng bộ: `docker compose logs --tail=50 backend-1 backend-2`; lưu ảnh vào `evidence/15-elasticsearch-sync.png`.
4. Kiểm tra số document trong index:

   ```powershell
   docker compose exec elasticsearch curl -fsS http://localhost:9200/techhub-products/_count
   ```

   Kết quả seed mới dự kiến có 40 sản phẩm; chỉ ghi số thực tế được trả về.
5. Tìm kiếm qua Nginx: `Invoke-RestMethod 'http://localhost:8081/api/products?q=ThinkCore'`. Chụp kết quả có sản phẩm liên quan vào `evidence/15-elasticsearch-search.png`.
6. Sửa tên một sản phẩm từ trang admin rồi chạy lại truy vấn để xác nhận index được cập nhật.

Không chụp localhost:9200 từ browser host: cổng Elasticsearch không được publish ra host.
