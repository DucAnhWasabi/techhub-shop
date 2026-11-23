# Sequence 11 - Cart khách và customer

![Sequence diagram: cart ](./11-cart.svg)

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
actor "Visitor" as Visitor #DBEAFE
actor "Customer" as Customer #DBEAFE
boundary "Browser" as Browser #BFDBFE
control "Express API" as API #DCFCE7
control "Cart Service" as Cart #DCFCE7
database "PostgreSQL" as DB #EDE9FE
Visitor -> Browser : Mở /cart hoặc thêm variant từ product detail
Browser -> API : GET /api/cart hoặc POST /api/cart/items
API -> Cart : Resolve cart theo session user hoặc cookie techhub.cart
Cart -> Cart : Hash guest token bằng SHA-256
Cart -> DB : Tìm hoặc tạo carts và đọc cart_items
DB --> Cart : Cart items
Cart --> API : Danh sách variant, giá, tồn kho và tổng tiền
API --> Browser : Danh sách variant, giá, tồn kho và tổng tiền
Visitor -> Browser : Sửa số lượng, xóa item hoặc xóa toàn bộ
Browser -> API : PATCH/DELETE /api/cart/items hoặc DELETE /api/cart + CSRF
API -> Cart : Kiểm tra item thuộc cart hiện tại và tồn kho
Cart -> DB : Cập nhật hoặc xóa cart_items
API --> Browser : Cart đã cập nhật
Visitor -> Browser : Đăng nhập
Browser -> API : POST /api/auth/login
API -> DB : Xác thực customer
API --> Browser : Session customer
Browser -> API : GET /api/cart
API -> Cart : Resolve customer cart và tìm guest cart từ cookie
Cart -> DB : Gộp item, giới hạn số lượng theo tồn kho, xóa guest cart
Cart --> API : Cart customer đã gộp
API --> Browser : Cart customer đã gộp
@enduml
```

</details>

Related code: `frontend/public/js/cart.js`, `frontend/public/js/product.js`, `src/routes/cartRoutes.js`, `src/controllers/cartController.js`, `src/services/cartService.js`.

API: `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:id`, `DELETE /api/cart/items/:id`, `DELETE /api/cart`. Thêm item yêu cầu quantity 1–99; cập nhật nhận quantity 0–99, trong đó 0 xóa item. Thao tác ghi cần CSRF. Cart guest dùng cookie HttpOnly; DB chỉ lưu hash của token.