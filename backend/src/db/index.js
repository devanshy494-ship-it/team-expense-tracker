import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  allowExitOnIdle: true,
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email               TEXT UNIQUE NOT NULL,
        password            TEXT NOT NULL,
        name                TEXT NOT NULL,
        is_verified         BOOLEAN DEFAULT FALSE,
        verification_token  TEXT,
        token_expires_at    TIMESTAMPTZ,
        created_at          TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token       TEXT UNIQUE NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        category    TEXT NOT NULL CHECK (category IN ('Food','Transport','Shopping','Bills','Entertainment','Other')),
        date        DATE NOT NULL,
        note        TEXT DEFAULT '',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category    TEXT NOT NULL CHECK (category IN ('Food','Transport','Shopping','Bills','Entertainment','Other')),
        amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        month       TEXT NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, category, month)
      );

      CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
    `);
    console.log('✓ Database schema ready');
  } finally {
    client.release();
  }
}
