-- ============================================================
-- Admin Role Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Tambah kolom role ke tabel users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- 2. Set owner sebagai admin dengan plan agency permanent
UPDATE users
SET
  role           = 'admin',
  plan           = 'agency',
  plan_expires_at = '2099-12-31 23:59:59+00'
WHERE email = 'ahmadzaid.tamiang@gmail.com';
