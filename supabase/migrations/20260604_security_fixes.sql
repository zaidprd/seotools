-- ============================================================
-- SEOTulis Security Fixes Migration
-- Run this in Supabase SQL Editor or via Supabase CLI
-- ============================================================

-- 1. Atomic credit deduction for article generation
--    Prevents race condition (TOCTOU) on concurrent requests.
--    Returns: { success: boolean, credits: integer }
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_amount INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits INTEGER;
BEGIN
  -- Single atomic UPDATE — safe under concurrent load
  UPDATE users
  SET
    credits       = credits - p_amount,
    credits_used  = COALESCE(credits_used, 0) + p_amount,
    articles_used = COALESCE(articles_used, 0) + 1
  WHERE id = p_user_id
    AND credits >= p_amount;

  IF FOUND THEN
    SELECT credits INTO v_credits FROM users WHERE id = p_user_id;
    RETURN jsonb_build_object('success', true, 'credits', v_credits);
  ELSE
    SELECT credits INTO v_credits FROM users WHERE id = p_user_id;
    RETURN jsonb_build_object('success', false, 'credits', COALESCE(v_credits, 0));
  END IF;
END;
$$;

-- 2. Atomic credit deduction for standalone image generation (no articles_used increment)
--    Returns: { success: boolean, credits: integer }
CREATE OR REPLACE FUNCTION deduct_image_credit(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits INTEGER;
BEGIN
  UPDATE users
  SET
    credits      = credits - 1,
    credits_used = COALESCE(credits_used, 0) + 1
  WHERE id = p_user_id
    AND credits >= 1;

  IF FOUND THEN
    SELECT credits INTO v_credits FROM users WHERE id = p_user_id;
    RETURN jsonb_build_object('success', true, 'credits', v_credits);
  ELSE
    SELECT credits INTO v_credits FROM users WHERE id = p_user_id;
    RETURN jsonb_build_object('success', false, 'credits', COALESCE(v_credits, 0));
  END IF;
END;
$$;

-- 3. Atomic credit refund (used when downstream API call fails after deduction)
CREATE OR REPLACE FUNCTION refund_credit(p_user_id UUID, p_amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
  SET
    credits      = credits + p_amount,
    credits_used = GREATEST(0, COALESCE(credits_used, 0) - p_amount)
  WHERE id = p_user_id;
END;
$$;

-- 4. Processed orders table for webhook idempotency
--    Prevents double-processing when Midtrans retries a webhook.
CREATE TABLE IF NOT EXISTS processed_orders (
  order_id     TEXT        PRIMARY KEY,
  user_id      UUID        REFERENCES users(id) ON DELETE SET NULL,
  plan_id      TEXT        NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: only service role can insert/select (webhooks run with service role key)
ALTER TABLE processed_orders ENABLE ROW LEVEL SECURITY;

-- Grant access to service role (bypasses RLS by default, but be explicit)
-- No public SELECT/INSERT — only server-side code with service key can access this table.

-- Index for potential cleanup queries
CREATE INDEX IF NOT EXISTS processed_orders_processed_at_idx ON processed_orders (processed_at);
