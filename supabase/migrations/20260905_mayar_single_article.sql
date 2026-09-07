-- Server-authoritative Mayar products and atomic settlement.
-- Apply after 20260613_mayar_payments.sql.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS trial_articles_remaining INTEGER NOT NULL DEFAULT 0;

ALTER TABLE payments
  ALTER COLUMN plan_id DROP NOT NULL;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS product_id TEXT,
  ADD COLUMN IF NOT EXISTS product_type TEXT,
  ADD COLUMN IF NOT EXISTS article_grants INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_days INTEGER;

-- Preserve existing rows while making new product-aware rows self-describing.
UPDATE payments
SET product_id = plan_id,
    product_type = 'plan',
    duration_days = 30
WHERE product_id IS NULL;

ALTER TABLE payments
  ALTER COLUMN product_id SET NOT NULL,
  ALTER COLUMN product_type SET NOT NULL;

-- Keep legacy server routes that only send plan_id compatible, while ensuring
-- canonical product values cannot be supplied by a client-controlled payload.
CREATE OR REPLACE FUNCTION normalize_mayar_payment_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.product_id := COALESCE(NEW.product_id, NEW.plan_id);

  CASE NEW.product_id
    WHEN 'trial_article' THEN
      NEW.product_type := 'one_time';
      NEW.plan_id := NULL;
      NEW.amount := 5000;
      NEW.credits := 0;
      NEW.article_grants := 1;
      NEW.duration_days := NULL;
    WHEN 'starter' THEN
      NEW.product_type := 'plan';
      NEW.plan_id := 'starter';
      NEW.amount := 25000;
      NEW.credits := 35;
      NEW.article_grants := 0;
      NEW.duration_days := 30;
    WHEN 'pro' THEN
      NEW.product_type := 'plan';
      NEW.plan_id := 'pro';
      NEW.amount := 75000;
      NEW.credits := 100;
      NEW.article_grants := 0;
      NEW.duration_days := 30;
    WHEN 'max' THEN
      NEW.product_type := 'plan';
      NEW.plan_id := 'max';
      NEW.amount := 150000;
      NEW.credits := 250;
      NEW.article_grants := 0;
      NEW.duration_days := 30;
    ELSE
      RAISE EXCEPTION 'Unknown billing product: %', NEW.product_id;
  END CASE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_mayar_payment_product_trigger ON payments;
CREATE TRIGGER normalize_mayar_payment_product_trigger
BEFORE INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION normalize_mayar_payment_product();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_product_type_check'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_product_type_check
      CHECK (product_type IN ('one_time', 'plan'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_article_grants_check'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_article_grants_check
      CHECK (article_grants >= 0);
  END IF;
END $$;

-- Prevent concurrent duplicate trial invoices. Failed/expired invoices may be retried.
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_active_trial_per_user_idx
  ON payments (user_id, product_id)
  WHERE product_id = 'trial_article' AND status IN ('pending', 'paid');

CREATE OR REPLACE FUNCTION settle_mayar_payment(
  p_payment_id UUID,
  p_verified_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_new_credits INTEGER;
  v_new_trial_articles INTEGER;
  v_expiry TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_payment
  FROM payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'not_found');
  END IF;

  IF v_payment.status = 'paid' THEN
    RETURN jsonb_build_object(
      'result', 'already_paid',
      'productId', v_payment.product_id,
      'planId', v_payment.plan_id
    );
  END IF;

  IF v_payment.status <> 'pending' THEN
    RETURN jsonb_build_object('result', 'not_pending');
  END IF;

  IF p_verified_amount IS DISTINCT FROM v_payment.amount THEN
    RETURN jsonb_build_object('result', 'amount_mismatch');
  END IF;

  IF v_payment.product_type = 'one_time' THEN
    UPDATE users
    SET trial_articles_remaining = trial_articles_remaining + v_payment.article_grants
    WHERE id = v_payment.user_id
    RETURNING trial_articles_remaining INTO v_new_trial_articles;
  ELSIF v_payment.product_type = 'plan' THEN
    v_expiry := GREATEST(COALESCE(
      (SELECT plan_expires_at FROM users WHERE id = v_payment.user_id), now()
    ), now()) + make_interval(days => COALESCE(v_payment.duration_days, 30));

    UPDATE users
    SET plan = v_payment.plan_id,
        credits = credits + v_payment.credits,
        plan_expires_at = v_expiry,
        subscription_id = v_payment.mayar_invoice_id
    WHERE id = v_payment.user_id
    RETURNING credits INTO v_new_credits;
  ELSE
    RAISE EXCEPTION 'Unsupported payment product type: %', v_payment.product_type;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment user not found: %', v_payment.user_id;
  END IF;

  UPDATE payments
  SET status = 'paid', paid_at = now()
  WHERE id = v_payment.id;

  RETURN jsonb_build_object(
    'result', CASE WHEN v_payment.product_type = 'one_time' THEN 'granted' ELSE 'credited' END,
    'productId', v_payment.product_id,
    'planId', v_payment.plan_id,
    'creditsAdded', v_payment.credits,
    'articleGrantsAdded', v_payment.article_grants,
    'newCredits', v_new_credits,
    'trialArticlesRemaining', v_new_trial_articles
  );
END;
$$;

REVOKE ALL ON FUNCTION settle_mayar_payment(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION settle_mayar_payment(UUID, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION consume_trial_article(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
  SET trial_articles_remaining = trial_articles_remaining - 1
  WHERE id = p_user_id AND trial_articles_remaining > 0;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION refund_trial_article(p_user_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE users
  SET trial_articles_remaining = trial_articles_remaining + 1
  WHERE id = p_user_id;
$$;

REVOKE ALL ON FUNCTION consume_trial_article(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION refund_trial_article(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_trial_article(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION refund_trial_article(UUID) TO service_role;
