# TechHub Shop - ERD

Sơ đồ dưới đây mô tả database hiện tại trong `db/schema.sql`. Các bảng `carts`, `orders`, `discounts` và `loyalty_points` đã có trong schema để chuẩn bị cho các chức năng tương ứng; việc có bảng chưa đồng nghĩa nghiệp vụ đã được triển khai trong Node.js.

```mermaid
erDiagram
    %% Theme đậm để đường quan hệ và viền entity rõ khi preview trên nền sáng.
    %%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "primaryColor": "#e8eefc", "primaryBorderColor": "#111827", "primaryTextColor": "#111827", "lineColor": "#111827", "textColor": "#111827", "secondaryColor": "#fef3c7", "tertiaryColor": "#dcfce7"}}}%%
    USERS {
        uuid id PK
        text email UK
        text full_name
        text password_hash
        text role
        boolean is_banned
        integer loyalty_balance
        timestamptz created_at
        timestamptz updated_at
    }

    OAUTH_ACCOUNTS {
        uuid id PK
        uuid user_id FK
        text provider
        text provider_user_id
        timestamptz created_at
    }

    PASSWORD_RESET_TOKENS {
        uuid id PK
        uuid user_id FK
        text token_hash UK
        timestamptz expires_at
        timestamptz used_at
        timestamptz created_at
    }

    ADDRESSES {
        uuid id PK
        uuid user_id FK
        text recipient_name
        text phone
        text line1
        text line2
        text ward
        text district
        text province
        text postal_code
        boolean is_default
        timestamptz created_at
        timestamptz updated_at
    }

    BRANDS {
        uuid id PK
        text name UK
        text slug UK
        text description
        timestamptz created_at
    }

    CATEGORIES {
        uuid id PK
        text name UK
        text slug UK
        text description
        uuid parent_id FK
    }

    PRODUCTS {
        uuid id PK
        text name
        text slug UK
        uuid brand_id FK
        uuid category_id FK
        text short_description
        text description
        text status
        timestamptz created_at
        timestamptz updated_at
    }

    PRODUCT_IMAGES {
        uuid id PK
        uuid product_id FK
        text image_url
        text alt_text
        integer position
    }

    VARIANTS {
        uuid id PK
        uuid product_id FK
        text sku UK
        text name
        jsonb attributes
        bigint price_vnd
        integer stock_quantity
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    REVIEWS {
        uuid id PK
        uuid product_id FK
        uuid user_id FK
        text author_name
        text body
        timestamptz created_at
    }

    RATINGS {
        uuid id PK
        uuid product_id FK
        uuid user_id FK
        smallint stars
        timestamptz created_at
        timestamptz updated_at
    }

    CARTS {
        uuid id PK
        uuid user_id FK
        text guest_token_hash UK
        timestamptz created_at
        timestamptz updated_at
    }

    CART_ITEMS {
        uuid id PK
        uuid cart_id FK
        uuid variant_id FK
        integer quantity
        timestamptz created_at
        timestamptz updated_at
    }

    DISCOUNTS {
        uuid id PK
        text code UK
        text discount_type
        bigint value
        smallint max_uses
        smallint used_count
        uuid created_by_admin_id FK
        timestamptz created_at
        boolean is_active
    }

    ORDERS {
        uuid id PK
        text order_number UK
        uuid user_id FK
        text email
        text recipient_name
        jsonb shipping_address_snapshot
        bigint subtotal_vnd
        bigint discount_vnd
        bigint loyalty_redeemed_vnd
        bigint tax_vnd
        bigint shipping_fee_vnd
        bigint total_vnd
        text status
        uuid discount_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid variant_id FK
        text sku_snapshot
        text product_name_snapshot
        text variant_name_snapshot
        bigint unit_price_vnd
        integer quantity
        bigint line_total_vnd
    }

    ORDER_STATUS_HISTORY {
        uuid id PK
        uuid order_id FK
        text status
        text note
        uuid changed_by_user_id FK
        timestamptz created_at
    }

    DISCOUNT_REDEMPTIONS {
        uuid id PK
        uuid discount_id FK
        uuid order_id FK
        uuid user_id FK
        bigint discount_vnd
        timestamptz created_at
    }

    LOYALTY_POINTS {
        uuid id PK
        uuid user_id FK
        uuid order_id FK
        text type
        integer points
        bigint amount_vnd
        timestamptz created_at
    }

    USERS ||--o{ OAUTH_ACCOUNTS : has
    USERS ||--o{ PASSWORD_RESET_TOKENS : requests
    USERS ||--o{ ADDRESSES : owns
    USERS ||--o{ REVIEWS : writes
    USERS ||--o{ RATINGS : submits
    USERS ||--o{ CARTS : owns
    USERS ||--o{ ORDERS : places
    USERS ||--o{ ORDER_STATUS_HISTORY : changes
    USERS ||--o{ DISCOUNT_REDEMPTIONS : uses
    USERS ||--o{ LOYALTY_POINTS : earns_or_redeems

    BRANDS ||--o{ PRODUCTS : brands
    CATEGORIES ||--o{ PRODUCTS : contains
    CATEGORIES ||--o{ CATEGORIES : parent_of
    PRODUCTS ||--o{ PRODUCT_IMAGES : has
    PRODUCTS ||--o{ VARIANTS : offers
    PRODUCTS ||--o{ REVIEWS : receives
    PRODUCTS ||--o{ RATINGS : receives

    CARTS ||--o{ CART_ITEMS : contains
    VARIANTS ||--o{ CART_ITEMS : selected_in

    DISCOUNTS ||--o{ ORDERS : applied_to
    DISCOUNTS ||--o{ DISCOUNT_REDEMPTIONS : redeemed_by
    ORDERS ||--o{ ORDER_ITEMS : contains
    ORDERS ||--o{ ORDER_STATUS_HISTORY : tracks
    ORDERS ||--o| DISCOUNT_REDEMPTIONS : creates
    VARIANTS ||--o{ ORDER_ITEMS : sold_as
    ORDERS ||--o{ LOYALTY_POINTS : generates
    DISCOUNTS }o--|| USERS : created_by_admin
    ORDER_STATUS_HISTORY }o--o| USERS : changed_by
    ORDER_ITEMS }o--o| VARIANTS : references
    LOYALTY_POINTS }o--o| ORDERS : linked_to
```

## Bảng mô tả entity

Bảng dưới đây là phần ERD dạng bảng, dùng để tra cứu nhanh các entity trong hình bên trên.

| Entity | Khóa chính | Khóa ngoại chính | Mục đích |
|---|---|---|---|
| `users` | `id` | - | Tài khoản customer/admin, trạng thái khóa và số dư loyalty |
| `oauth_accounts` | `id` | `user_id -> users.id` | Liên kết tài khoản Google/Facebook |
| `password_reset_tokens` | `id` | `user_id -> users.id` | Token khôi phục mật khẩu có thời hạn |
| `addresses` | `id` | `user_id -> users.id` | Nhiều địa chỉ giao hàng của user |
| `brands` | `id` | - | Thương hiệu sản phẩm |
| `categories` | `id` | `parent_id -> categories.id` | Danh mục sản phẩm cha/con |
| `products` | `id` | `brand_id -> brands.id`, `category_id -> categories.id` | Thông tin sản phẩm |
| `product_images` | `id` | `product_id -> products.id` | Nhiều ảnh của sản phẩm |
| `variants` | `id` | `product_id -> products.id` | Variant, SKU, giá và tồn kho độc lập |
| `reviews` | `id` | `product_id -> products.id`, `user_id -> users.id` | Bình luận, có thể là guest comment |
| `ratings` | `id` | `product_id -> products.id`, `user_id -> users.id` | Rating 1-5 sao của customer |
| `carts` | `id` | `user_id -> users.id` hoặc guest token | Giỏ hàng của user hoặc guest |
| `cart_items` | `id` | `cart_id -> carts.id`, `variant_id -> variants.id` | Các variant và số lượng trong cart |
| `discounts` | `id` | `created_by_admin_id -> users.id` | Mã giảm giá do admin tạo |
| `orders` | `id` | `user_id -> users.id`, `discount_id -> discounts.id` | Đơn hàng và tổng tiền tại thời điểm mua |
| `order_items` | `id` | `order_id -> orders.id`, `variant_id -> variants.id` | Chi tiết sản phẩm trong order, có snapshot giá |
| `order_status_history` | `id` | `order_id -> orders.id`, `changed_by_user_id -> users.id` | Lịch sử thay đổi trạng thái order |
| `discount_redemptions` | `id` | `discount_id -> discounts.id`, `order_id -> orders.id`, `user_id -> users.id` | Lưu việc sử dụng discount trong order |
| `loyalty_points` | `id` | `user_id -> users.id`, `order_id -> orders.id` | Điểm earned/redeemed/adjustment |

## Bảng khóa và ràng buộc

| Bảng | Ràng buộc quan trọng |
|---|---|
| `users` | `email` duy nhất; chỉ một user có role `admin` |
| `addresses` | Mỗi user chỉ có một địa chỉ `is_default = TRUE` |
| `products` | `slug` duy nhất; status chỉ là `active` hoặc `hidden` |
| `variants` | `sku` duy nhất; giá và tồn kho không âm |
| `ratings` | Một user chỉ rating một product một lần; stars từ 1 đến 5 |
| `carts` | Cart phải thuộc user hoặc có guest token, không được đồng thời cả hai |
| `cart_items` | Một variant chỉ xuất hiện một lần trong cùng cart; quantity lớn hơn 0 |
| `discounts` | Code đúng 5 ký tự chữ/số; số lượt dùng tối đa là 10 |
| `orders` | `order_number` duy nhất; lưu snapshot địa chỉ và giá trị đơn |
| `discount_redemptions` | Một order chỉ có tối đa một redemption record |

## Quan hệ chính

1. `users` là bảng trung tâm cho customer và admin.
2. Một user có thể có nhiều OAuth account, password reset token, địa chỉ, review, rating, cart, order và loyalty record.
3. Một product thuộc một brand và một category; product có nhiều image, variant, review và rating.
4. Một cart có nhiều `cart_items`; mỗi cart item trỏ tới một variant.
5. Một order thuộc một user và có nhiều `order_items`, `order_status_history` và loyalty record.
6. `order_items` lưu snapshot tên sản phẩm, SKU, tên variant và giá tại thời điểm mua để không phụ thuộc dữ liệu product thay đổi sau này.
7. `shipping_address_snapshot` trong `orders` lưu địa chỉ tại thời điểm đặt hàng.
8. `discount_redemptions` liên kết discount, order và user; `order_id` là duy nhất nên một order chỉ có một redemption record.
9. `categories.parent_id` cho phép tạo danh mục cha/con.

## Ràng buộc đáng chú ý

- Chỉ có một user có role `admin` nhờ partial unique index `one_admin_only`.
- Mỗi user chỉ có một địa chỉ mặc định nhờ partial unique index `one_default_address_per_user`.
- Một user chỉ được rating một lần cho mỗi product nhờ `UNIQUE(product_id, user_id)`.
- Discount code có đúng 5 ký tự chữ và số, `max_uses` từ 1 đến 10.
- Variant phải có giá và tồn kho không âm.
- Rating phải nằm trong khoảng 1 đến 5 sao.
- Cart phải là cart của user hoặc guest token, không được đồng thời có cả hai.
- Product status hiện chỉ nhận `active` hoặc `hidden`.
