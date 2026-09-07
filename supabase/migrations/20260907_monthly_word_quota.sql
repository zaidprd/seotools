-- Monthly word quotas replace credits for newly settled billing products.
-- This is additive so legacy users without a monthly_word_quota retain credit billing.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS monthly_word_quota INTEGER,
  ADD COLUMN IF NOT EXISTS monthly_words_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_words_per_article INTEGER,
  ADD COLUMN IF NOT EXISTS word_quota_period_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_words_remaining INTEGER NOT NULL DEFAULT 0;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS word_quota INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_words_per_article INTEGER;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_monthly_word_quota_nonnegative,
  DROP CONSTRAINT IF EXISTS users_monthly_words_used_nonnegative,
  DROP CONSTRAINT IF EXISTS users_max_words_per_article_positive,
  DROP CONSTRAINT IF EXISTS users_trial_words_remaining_nonnegative;

ALTER TABLE users
  ADD CONSTRAINT users_monthly_word_quota_nonnegative
    CHECK (monthly_word_quota IS NULL OR monthly_word_quota >= 0),
  ADD CONSTRAINT users_monthly_words_used_nonnegative
    CHECK (monthly_words_used >= 0),
  ADD CONSTRAINT users_max_words_per_article_positive
    CHECK (max_words_per_article IS NULL OR max_words_per_article > 0),
  ADD CONSTRAINT users_trial_words_remaining_nonnegative
    CHECK (trial_words_remaining >= 0);

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_word_quota_nonnegative,
  DROP CONSTRAINT IF EXISTS payments_max_words_per_article_positive;

ALTER TABLE payments
  ADD CONSTRAINT payments_word_quota_nonnegative CHECK (word_quota >= 0),
  ADD CONSTRAINT payments_max_words_per_article_positive
    CHECK (max_words_per_article IS NULL OR max_words_per_article > 0);

-- Existing paid trial grants predate word accounting. Give each unspent trial its
-- original allowance so they remain usable after this migration.
UPDATE users
SET trial_words_remaining = GREATEST(trial_articles_remaining, 0) * 2000
WHERE trial_words_remaining = 0
  AND trial_articles_remaining > 0;

-- Make historical payment rows self-describing without changing their settlement.
UPDATE payments
SET word_quota = CASE product_id
      WHEN 'trial_article' THEN 2000
      WHEN 'starter' THEN 6000
      WHEN 'pro' THEN 25000
      WHEN 'max' THEN 60000
      ELSE word_quota
    END,
    max_words_per_article = CASE product_id
      WHEN 'trial_article' THEN 2000
      WHEN 'starter' THEN 2000
      WHEN 'pro' THEN 2000
      WHEN 'max' THEN 2500
      ELSE max_words_per_article
    END
WHERE product_id IN ('trial_article', 'starter', 'pro', 'max');

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
      NEW.word_quota := 2000;
      NEW.max_words_per_article := 2000;
    WHEN 'starter' THEN
      NEW.product_type := 'plan';
      NEW.plan_id := 'starter';
      NEW.amount := 25000;
      NEW.credits := 35;
      NEW.article_grants := 0;
      NEW.duration_days := 30;
      NEW.word_quota := 6000;
      NEW.max_words_per_article := 2000;
    WHEN 'pro' THEN
      NEW.product_type := 'plan';
      NEW.plan_id := 'pro';
      NEW.amount := 75000;
      NEW.credits := 100;
      NEW.article_grants := 0;
      NEW.duration_days := 30;
      NEW.word_quota := 25000;
      NEW.max_words_per_article := 2000;
    WHEN 'max' THEN
      NEW.product_type := 'plan';
      NEW.plan_id := 'max';
      NEW.amount := 150000;
      NEW.credits := 250;
      NEW.article_grants := 0;
      NEW.duration_days := 30;
      NEW.word_quota := 60000;
      NEW.max_words_per_article := 2500;
    ELSE
      RAISE EXCEPTION 'Unknown billing product: %', NEW.product_id;
  END CASE;

  RETURN NEW;
END;
$$;

-- Recreate the trigger so all new invoice fields are server-authoritative.
DROP TRIGGER IF EXISTS normalize_mayar_payment_product_trigger ON payments;
CREATE TRIGGER normalize_mayar_payment_product_trigger
BEFORE INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION normalize_mayar_payment_product();

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
  v_new_trial_words INTEGER;
  v_new_monthly_word_quota INTEGER;
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
    SET trial_articles_remaining = trial_articles_remaining + v_payment.article_grants,
        trial_words_remaining = trial_words_remaining + v_payment.word_quota
    WHERE id = v_payment.user_id
    RETURNING trial_articles_remaining, trial_words_remaining
    INTO v_new_trial_articles, v_new_trial_words;
  ELSIF v_payment.product_type = 'plan' THEN
    v_expiry := GREATEST(COALESCE(
      (SELECT plan_expires_at FROM users WHERE id = v_payment.user_id), now()
    ), now()) + make_interval(days => COALESCE(v_payment.duration_days, 30));

    -- A successful plan payment starts a fresh period: unused words never roll
    -- forward into the new period.
    UPDATE users
    SET plan = v_payment.plan_id,
        credits = credits + v_payment.credits,
        plan_expires_at = v_expiry,
        subscription_id = v_payment.mayar_invoice_id,
        monthly_word_quota = v_payment.word_quota,
        monthly_words_used = 0,
        max_words_per_article = v_payment.max_words_per_article,
        word_quota_period_ends_at = v_expiry
    WHERE id = v_payment.user_id
    RETURNING credits, monthly_word_quota INTO v_new_credits, v_new_monthly_word_quota;
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
    'wordQuotaAdded', v_payment.word_quota,
    'newCredits', v_new_credits,
    'monthlyWordQuota', v_new_monthly_word_quota,
    'trialArticlesRemaining', v_new_trial_articles,
    'trialWordsRemaining', v_new_trial_words
  );
END;
$$;

CREATE OR REPLACE FUNCTION consume_trial_word_quota(p_user_id UUID, p_words INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_articles INTEGER;
  v_words INTEGER;
BEGIN
  IF p_words <= 0 OR p_words > 2000 THEN
    RAISE EXCEPTION 'Trial word reservation must be between 1 and 2000 words';
  END IF;

  UPDATE users
  SET trial_articles_remaining = trial_articles_remaining - 1,
      trial_words_remaining = trial_words_remaining - p_words
  WHERE id = p_user_id
    AND trial_articles_remaining > 0
    AND trial_words_remaining >= p_words
  RETURNING trial_articles_remaining, trial_words_remaining INTO v_articles, v_words;

  RETURN jsonb_build_object(
    'success', FOUND,
    'trialArticlesRemaining', COALESCE(v_articles, 0),
    'trialWordsRemaining', COALESCE(v_words, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION refund_trial_word_quota(p_user_id UUID, p_words INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_words <= 0 OR p_words > 2000 THEN
    RAISE EXCEPTION 'Trial word refund must be between 1 and 2000 words';
  END IF;

  UPDATE users
  SET trial_articles_remaining = trial_articles_remaining + 1,
      trial_words_remaining = trial_words_remaining + p_words
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION consume_monthly_word_quota(p_user_id UUID, p_words INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quota INTEGER;
  v_used INTEGER;
BEGIN
  IF p_words <= 0 THEN
    RAISE EXCEPTION 'Word reservation must be positive';
  END IF;

  UPDATE users
  SET monthly_words_used = monthly_words_used + p_words
  WHERE id = p_user_id
    AND monthly_word_quota IS NOT NULL
    AND max_words_per_article IS NOT NULL
    AND p_words <= max_words_per_article
    AND word_quota_period_ends_at > now()
    AND monthly_words_used + p_words <= monthly_word_quota
  RETURNING monthly_word_quota, monthly_words_used INTO v_quota, v_used;

  RETURN jsonb_build_object(
    'success', FOUND,
    'wordQuota', COALESCE(v_quota, 0),
    'wordsUsed', COALESCE(v_used, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION refund_monthly_word_quota(p_user_id UUID, p_words INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_words <= 0 THEN
    RAISE EXCEPTION 'Word refund must be positive';
  END IF;

  UPDATE users
  SET monthly_words_used = GREATEST(0, monthly_words_used - p_words)
  WHERE id = p_user_id
    AND monthly_word_quota IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION settle_mayar_payment(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION consume_trial_word_quota(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION refund_trial_word_quota(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION consume_monthly_word_quota(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION refund_monthly_word_quota(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION settle_mayar_payment(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION consume_trial_word_quota(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION refund_trial_word_quota(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION consume_monthly_word_quota(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION refund_monthly_word_quota(UUID, INTEGER) TO service_role;
