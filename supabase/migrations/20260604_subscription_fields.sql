-- ============================================================
-- Subscription System Fields Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Tambah kolom subscription ke tabel users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS auto_renew      BOOLEAN NOT NULL DEFAULT true;

-- plan_expires_at sudah ada dari migration sebelumnya, tapi pastikan ada
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
