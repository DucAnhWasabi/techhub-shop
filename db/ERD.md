# TechHub Shop — ERD theo nhóm nghiệp vụ

Các hình bên dưới bám theo `db/schema.sql` và migration hiện tại. ERD được tách nhỏ để dễ đọc; bảng cha/con nối với nhau bằng đường quan hệ có cardinality. Vì đường quan hệ đã biểu diễn khóa ngoại, các box chỉ liệt kê khóa chính và thuộc tính đáng chú ý, không lặp lại cột FK.

Ký hiệu ở đầu mỗi đường nói số bản ghi có thể tham gia quan hệ: `||` là đúng một, `o|` là không hoặc một, `o{` là không hoặc nhiều. Ví dụ `USERS ||--o{ ADDRESSES` nghĩa một user có thể có nhiều địa chỉ, còn mỗi địa chỉ thuộc đúng một user. Với quan hệ tùy chọn, phía `o|` khớp FK nullable trong schema.

## 1. Tài khoản, đăng nhập và địa chỉ

![ERD: 1. Tài khoản, đăng nhập và địa chỉ](./ERD-01.svg)

<details>
<summary>Mermaid source</summary>

```mermaid
%%{init: {"theme":"base", "themeVariables":{"fontFamily":"Arial","fontSize":"18px","primaryColor":"#eff6ff","primaryBorderColor":"#1e3a8a","primaryTextColor":"#111827","lineColor":"#111827","textColor":"#111827"}}}%%
erDiagram
    USERS {
        uuid id PK
        text email UK
        text full_name
        text role
        boolean is_banned
        integer loyalty_balance
    }
    OAUTH_ACCOUNTS {
        uuid id PK
        text provider
        text provider_user_id
    }
    PASSWORD_RESET_TOKENS {
        uuid id PK
        text token_hash UK
        timestamptz expires_at
        timestamptz used_at
    }
    ADDRESSES {
        uuid id PK
        text recipient_name
        text phone
        text line1
        text province
        boolean is_default
    }

    USERS ||--o{ OAUTH_ACCOUNTS : liên_kết
    USERS ||--o{ PASSWORD_RESET_TOKENS : yêu_cầu
    USERS ||--o{ ADDRESSES : sở_hữu
```

</details>

## 2. Danh mục và nội dung sản phẩm

![ERD: 2. Danh mục và nội dung sản phẩm](./ERD-02.svg)

<details>
<summary>Mermaid source</summary>

```mermaid
%%{init: {"theme":"base", "themeVariables":{"fontFamily":"Arial","fontSize":"18px","primaryColor":"#eff6ff","primaryBorderColor":"#1e3a8a","primaryTextColor":"#111827","lineColor":"#111827","textColor":"#111827"}}}%%
erDiagram
    BRANDS {
        uuid id PK
        text name UK
        text slug UK
    }
    CATEGORIES {
        uuid id PK
        text name UK
        text slug UK
    }
    PRODUCTS {
        uuid id PK
        text name
        text slug UK
        text status
    }
    PRODUCT_IMAGES {
        uuid id PK
        text image_url
        integer position
    }
    VARIANTS {
        uuid id PK
        text sku UK
        text name
        bigint price_vnd
        bigint cost_vnd
        integer stock_quantity
    }
    REVIEWS {
        uuid id PK
        text author_name
        text body
    }
    RATINGS {
        uuid id PK
        smallint stars
        timestamptz updated_at
    }
    USERS {
        uuid id PK
        text full_name
    }

    BRANDS ||--o{ PRODUCTS : thương_hiệu
    CATEGORIES ||--o{ PRODUCTS : phân_loại
    CATEGORIES o|--o{ CATEGORIES : danh_mục_cha
    PRODUCTS ||--o{ PRODUCT_IMAGES : có_ảnh
    PRODUCTS ||--o{ VARIANTS : có_biến_thể
    PRODUCTS ||--o{ REVIEWS : nhận_bình_luận
    PRODUCTS ||--o{ RATINGS : nhận_đánh_giá
    USERS o|--o{ REVIEWS : viết_review
    USERS ||--o{ RATINGS : đánh_giá
```

</details>

`variants.cost_vnd` là giá vốn hiện dùng cho báo cáo lợi nhuận quản trị. Mỗi rating gắn với một customer/product duy nhất; review có thể không gắn user nếu được gửi khi chưa đăng nhập.

## 3. Cart guest và customer

![ERD: 3. Cart guest và customer](./ERD-03.svg)

<details>
<summary>Mermaid source</summary>

```mermaid
%%{init: {"theme":"base", "themeVariables":{"fontFamily":"Arial","fontSize":"18px","primaryColor":"#eff6ff","primaryBorderColor":"#1e3a8a","primaryTextColor":"#111827","lineColor":"#111827","textColor":"#111827"}}}%%
erDiagram
    USERS {
        uuid id PK
        text email UK
    }
    CARTS {
        uuid id PK
        text guest_token_hash UK
        timestamptz created_at
    }
    CART_ITEMS {
        uuid id PK
        integer quantity
    }
    VARIANTS {
        uuid id PK
        text sku UK
        bigint price_vnd
        integer stock_quantity
    }

    USERS o|--o| CARTS : sở_hữu_cart
    CARTS ||--o{ CART_ITEMS : chứa
    VARIANTS ||--o{ CART_ITEMS : được_chọn
```

</details>

Mỗi cart thuộc đúng một customer hoặc guest token: hai định danh loại trừ nhau bằng CHECK constraint. Guest token trong cookie được hash trước khi lưu. Khi customer đăng nhập, cart guest được gộp vào cart customer.

## 4. Đơn hàng và lịch sử trạng thái

![ERD: 4. Đơn hàng và lịch sử trạng thái](./ERD-04.svg)

<details>
<summary>Mermaid source</summary>

```mermaid
%%{init: {"theme":"base", "themeVariables":{"fontFamily":"Arial","fontSize":"18px","primaryColor":"#eff6ff","primaryBorderColor":"#1e3a8a","primaryTextColor":"#111827","lineColor":"#111827","textColor":"#111827"}}}%%
erDiagram
    USERS {
        uuid id PK
        text email UK
        text full_name
    }
    ORDERS {
        uuid id PK
        text order_number UK
        jsonb shipping_address_snapshot
        bigint subtotal_vnd
        bigint total_vnd
        text status
    }
    ORDER_ITEMS {
        uuid id PK
        text sku_snapshot
        text product_name_snapshot
        bigint unit_price_vnd
        bigint unit_cost_vnd
        integer quantity
    }
    ORDER_STATUS_HISTORY {
        uuid id PK
        text status
        text note
        timestamptz created_at
    }
    VARIANTS {
        uuid id PK
        text sku UK
    }

    USERS ||--o{ ORDERS : đặt_đơn
    ORDERS ||--o{ ORDER_ITEMS : gồm_dòng_hàng
    ORDERS ||--o{ ORDER_STATUS_HISTORY : ghi_lịch_sử
    VARIANTS o|--o{ ORDER_ITEMS : tham_chiếu
    USERS o|--o{ ORDER_STATUS_HISTORY : cập_nhật_bởi
```

</details>

Guest checkout tạo/liên kết customer theo email nên `orders.user_id` luôn có giá trị. Order và từng item giữ snapshot để lịch sử mua không đổi khi sản phẩm hoặc địa chỉ được chỉnh sửa. `order_items.variant_id` có thể NULL nếu variant được xóa; dòng hàng snapshot vẫn được giữ.

## 5. Discount và loyalty

![ERD: 5. Discount và loyalty](./ERD-05.svg)

<details>
<summary>Mermaid source</summary>

```mermaid
%%{init: {"theme":"base", "themeVariables":{"fontFamily":"Arial","fontSize":"18px","primaryColor":"#eff6ff","primaryBorderColor":"#1e3a8a","primaryTextColor":"#111827","lineColor":"#111827","textColor":"#111827"}}}%%
erDiagram
    USERS {
        uuid id PK
        text email UK
        integer loyalty_balance
    }
    DISCOUNTS {
        uuid id PK
        text code UK
        text discount_type
        bigint value
        smallint max_uses
        smallint used_count
        boolean is_active
    }
    ORDERS {
        uuid id PK
        text order_number UK
        bigint discount_vnd
        bigint loyalty_redeemed_vnd
    }
    DISCOUNT_REDEMPTIONS {
        uuid id PK
        bigint discount_vnd
        timestamptz created_at
    }
    LOYALTY_POINTS {
        uuid id PK
        text type
        integer points
        bigint amount_vnd
    }

    USERS ||--o{ DISCOUNTS : tạo_discount
    DISCOUNTS o|--o{ ORDERS : áp_dụng
    DISCOUNTS ||--o{ DISCOUNT_REDEMPTIONS : redemption
    ORDERS ||--o| DISCOUNT_REDEMPTIONS : tối_đa_một_lần
    USERS ||--o{ DISCOUNT_REDEMPTIONS : sử_dụng
    USERS ||--o{ LOYALTY_POINTS : loyalty_ledger
    ORDERS o|--o{ LOYALTY_POINTS : phát_sinh
```

</details>

Discount redemption có tối đa một dòng cho mỗi order nhờ UNIQUE `order_id`. Loyalty ledger lưu earned/redeemed/adjustment; order link có thể NULL cho giao dịch điều chỉnh độc lập. Admin tạo discount; source hiện hỗ trợ tạo và xem danh sách mã.

## Ràng buộc chính trong schema

- Chỉ một tài khoản có role `admin`; mỗi customer có tối đa một cart; mỗi customer có tối đa một địa chỉ mặc định.
- Một customer chỉ đánh giá một lần cho mỗi sản phẩm; số sao từ 1 đến 5.
- SKU, email, slug sản phẩm và mã discount là duy nhất. Mã discount có đúng 5 ký tự chữ-số, tối đa 10 lượt sử dụng.
- Giá, giá vốn và tồn kho không âm; số lượng trong cart/order phải lớn hơn 0.
- Product status chỉ nhận `active` hoặc `hidden`; order status hiện được service giới hạn trong `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`.

## Phạm vi tính năng theo source hiện tại

- Đã có cart, quote/checkout COD, tạo order trong transaction, coupon, loyalty, email sau commit và customer order history.
- Đã có admin dashboard/analytics, quản lý sản phẩm/customer/order và discount; luồng admin được mô tả ở `bonus/13-admin.md`.
- Chưa có payment gateway; hình ERD mô tả schema chứ không biểu diễn trạng thái triển khai hay hệ thống bên ngoài.
