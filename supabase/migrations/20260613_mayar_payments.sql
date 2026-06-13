-- ============================================================
-- Mayar Payments Migration
-- Melacak invoice Mayar agar webhook/redirect bisa memetakan
-- pembayaran kembali ke user + paket. Jalankan di Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id              TEXT NOT NULL,
  amount               INTEGER NOT NULL,
  credits              INTEGER NOT NULL,
  mayar_invoice_id     TEXT UNIQUE,
  mayar_transaction_id TEXT,
  payment_url          TEXT,
  status               TEXT NOT NULL DEFAULT 'pending', -- pending | paid | expired
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS payments_user_idx    ON payments (user_id);
CREATE INDEX IF NOT EXISTS payments_invoice_idx ON payments (mayar_invoice_id);
CREATE INDEX IF NOT EXISTS payments_txn_idx     ON payments (mayar_transaction_id);

-- RLS aktif: hanya service role (server) yang akses tabel ini.
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
