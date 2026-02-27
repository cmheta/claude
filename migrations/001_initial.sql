-- Migration 001: Initial schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164  TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE item_status AS ENUM ('active', 'stopped', 'error');

CREATE TABLE IF NOT EXISTS tracked_items (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url                      TEXT NOT NULL,
  retailer                 TEXT NOT NULL,
  target_price_gbp_pennies INTEGER NOT NULL,
  last_price_gbp_pennies   INTEGER,
  last_checked_at          TIMESTAMPTZ,
  alert_sent_at            TIMESTAMPTZ,
  status                   item_status NOT NULL DEFAULT 'active',
  error_message            TEXT,
  title                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracked_items_user_id ON tracked_items(user_id);
CREATE INDEX IF NOT EXISTS idx_tracked_items_status ON tracked_items(status);

CREATE TABLE IF NOT EXISTS price_checks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_item_id UUID NOT NULL REFERENCES tracked_items(id) ON DELETE CASCADE,
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  price_pennies   INTEGER,
  success         BOOLEAN NOT NULL,
  raw_snippet     TEXT
);

CREATE INDEX IF NOT EXISTS idx_price_checks_item_id ON price_checks(tracked_item_id);
