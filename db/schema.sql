CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  loyalty_balance INTEGER NOT NULL DEFAULT 0 CHECK (loyalty_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_admin_only ON users ((role)) WHERE role = 'admin';

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google','facebook')), provider_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(provider, provider_user_id)
);
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', line1 TEXT NOT NULL, line2 TEXT NOT NULL DEFAULT '',
  ward TEXT NOT NULL DEFAULT '', district TEXT NOT NULL DEFAULT '', province TEXT NOT NULL,
  postal_code TEXT NOT NULL DEFAULT '', is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_default_address_per_user
  ON addresses(user_id) WHERE is_default = TRUE;
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '', parent_id UUID REFERENCES categories(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  brand_id UUID NOT NULL REFERENCES brands(id), category_id UUID NOT NULL REFERENCES categories(id),
  short_description TEXT NOT NULL, description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL, alt_text TEXT NOT NULL DEFAULT '', position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE, name TEXT NOT NULL, attributes JSONB NOT NULL DEFAULT '{}',
  price_vnd BIGINT NOT NULL CHECK (price_vnd >= 0), stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, author_name TEXT NOT NULL, body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, stars SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(product_id,user_id)
);
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  guest_token_hash TEXT UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((user_id IS NULL) <> (guest_token_hash IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS one_cart_per_user ON carts(user_id) WHERE user_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES variants(id), quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(cart_id,variant_id)
);
CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code CHAR(5) NOT NULL UNIQUE CHECK (code ~ '^[A-Za-z0-9]{5}$'),
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent','fixed')), value BIGINT NOT NULL CHECK (value > 0),
  max_uses SMALLINT NOT NULL DEFAULT 10 CHECK (max_uses BETWEEN 1 AND 10), used_count SMALLINT NOT NULL DEFAULT 0 CHECK (used_count BETWEEN 0 AND max_uses),
  created_by_admin_id UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id), email TEXT NOT NULL, recipient_name TEXT NOT NULL,
  shipping_address_snapshot JSONB NOT NULL, subtotal_vnd BIGINT NOT NULL, discount_vnd BIGINT NOT NULL DEFAULT 0,
  loyalty_redeemed_vnd BIGINT NOT NULL DEFAULT 0, tax_vnd BIGINT NOT NULL DEFAULT 0, shipping_fee_vnd BIGINT NOT NULL DEFAULT 0,
  total_vnd BIGINT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', discount_id UUID REFERENCES discounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES variants(id) ON DELETE SET NULL, sku_snapshot TEXT NOT NULL,
  product_name_snapshot TEXT NOT NULL, variant_name_snapshot TEXT NOT NULL, unit_price_vnd BIGINT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0), line_total_vnd BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS discount_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), discount_id UUID NOT NULL REFERENCES discounts(id),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id),
  discount_vnd BIGINT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('earned','redeemed','adjustment')), points INTEGER NOT NULL,
  amount_vnd BIGINT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS products_brand_idx ON products(brand_id);
CREATE INDEX IF NOT EXISTS variants_price_idx ON variants(price_vnd);
CREATE INDEX IF NOT EXISTS orders_user_recent_idx ON orders(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS order_history_recent_idx ON order_status_history(order_id,created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_product_recent_idx ON reviews(product_id,created_at DESC);
CREATE INDEX IF NOT EXISTS ratings_product_idx ON ratings(product_id,stars);
