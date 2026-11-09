require('dotenv').config();
const db = require('../src/config/db');

async function migrate() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS password_reset_user_idx
      ON password_reset_tokens(user_id, expires_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS one_default_address_per_user
      ON addresses(user_id) WHERE is_default = TRUE;
    CREATE INDEX IF NOT EXISTS reviews_product_recent_idx ON reviews(product_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS ratings_product_idx ON ratings(product_id,stars);
  `);
  console.log('Migration hoàn tất.');
  await db.end();
}

migrate().catch(async (error) => {
  console.error('Migration thất bại:', error.message);
  await db.end();
  process.exit(1);
});
