# Sequence 13 - Admin dashboard và quản lý cửa hàng

![Sequence diagram: admin ](./13-admin.svg)

<details>
<summary>PlantUML source</summary>



```plantuml
@startuml
skinparam defaultFontName Arial
skinparam defaultFontSize 17
skinparam sequenceMessageAlign center
skinparam sequenceArrowThickness 1.5
skinparam ParticipantBorderColor #1F2937
skinparam ActorBorderColor #1F2937
skinparam LifeLineBorderColor #374151
skinparam LifeLineBackgroundColor #FFFFFF
actor "Admin" as Admin #DBEAFE
boundary "Admin Browser" as Browser #BFDBFE
control "Express API" as API #DCFCE7
control "requireAdmin" as Guard #DCFCE7
control "Admin Service" as Service #DCFCE7
database "PostgreSQL" as DB #EDE9FE
Admin -> Browser : Mở /admin
Browser -> API : GET /api/admin/dashboard và /analytics
API -> Guard : Kiểm tra session và role admin
Guard -> Service : Lấy chỉ số tổng quan, bán chạy và báo cáo theo kỳ
Service -> DB : Đọc users, orders, order_items, variants
DB --> Service : Dashboard và dữ liệu analytics
Service --> API : Dashboard và chuỗi doanh thu/lợi nhuận
API --> Browser : Dashboard và chuỗi doanh thu/lợi nhuận
Admin -> Browser : Tạo/cập nhật/xóa sản phẩm
Browser -> API : POST/PATCH/DELETE /api/admin/products + CSRF
API -> Guard : Xác thực admin
Guard -> Service : Validate product, ảnh và variants
Service -> DB : Transaction ghi products, product_images, variants
DB --> Service : Kết quả ghi sản phẩm
Service --> API : Kết quả quản lý sản phẩm
API --> Browser : Kết quả quản lý sản phẩm
Admin -> Browser : Cập nhật customer hoặc trạng thái order
Browser -> API : PATCH /api/admin/users/:id hoặc /orders/:id/status + CSRF
API -> Guard : Xác thực admin
Guard -> Service : Cập nhật hồ sơ/khóa user hoặc trạng thái order
Service -> DB : Ghi users hoặc orders và order_status_history
DB --> Service : Kết quả cập nhật
Service --> API : Kết quả cập nhật
API --> Browser : Kết quả cập nhật
Admin -> Browser : Tạo mã discount
Browser -> API : POST /api/admin/discounts + CSRF
API -> Guard : Xác thực admin
Guard -> Service : Kiểm tra code, loại giảm và giới hạn lượt
Service -> DB : Insert discounts
DB --> Service : Discount vừa tạo
Service --> API : Mã discount vừa tạo
API --> Browser : Mã discount vừa tạo
@enduml
```

</details>

Related code: `frontend/views/admin.ejs`, `frontend/public/js/admin.js`, `src/routes/adminRoutes.js`, `src/controllers/adminController.js`, `src/services/adminService.js`, `src/middleware/auth.js`.

`/admin` là frontend page; các API dưới `/api/admin` đều áp dụng `requireAdmin`. Admin hiện có dashboard và báo cáo analytics, CRUD sản phẩm, khóa/sửa customer, đọc và cập nhật trạng thái đơn, cùng tạo/xem discount. Request ghi dữ liệu đi qua CSRF protection. Không có chức năng xóa user hoặc xóa discount trong routes hiện tại.