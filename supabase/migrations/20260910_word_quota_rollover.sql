-- Carry unused paid word quota into a renewed plan while keeping liability bounded.
-- Rollover is available for renewals paid before, or up to seven days after,
-- the previous word-quota period ends. The carried amount is capped at one
-- base quota of the newly purchased plan.

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
  v_user users%ROWTYPE;
  v_new_credits INTEGER;
  v_new_trial_articles INTEGER;
  v_new_trial_words INTEGER;
  v_new_monthly_word_quota INTEGER;
  v_rollover_words INTEGER := 0;
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

  SELECT * INTO v_user
  FROM users
  WHERE id = v_payment.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment user not found: %', v_payment.user_id;
  END IF;

  IF v_payment.product_type = 'one_time' THEN
    UPDATE users
    SET trial_articles_remaining = trial_articles_remaining + v_payment.article_grants,
        trial_words_remaining = trial_words_remaining + v_payment.word_quota
    WHERE id = v_payment.user_id
    RETURNING trial_articles_remaining, trial_words_remaining
    INTO v_new_trial_articles, v_new_trial_words;
  ELSIF v_payment.product_type = 'plan' THEN
    v_expiry := GREATEST(COALESCE(v_user.plan_expires_at, now()), now())
      + make_interval(days => COALESCE(v_payment.duration_days, 30));

    IF v_user.word_quota_period_ends_at IS NOT NULL
       AND v_user.word_quota_period_ends_at >= now() - interval '7 days'
       AND COALESCE(v_user.monthly_word_quota, 0) > 0 THEN
      v_rollover_words := LEAST(
        GREATEST(
          COALESCE(v_user.monthly_word_quota, 0) - COALESCE(v_user.monthly_words_used, 0),
          0
        ),
        v_payment.word_quota
      );
    END IF;

    UPDATE users
    SET plan = v_payment.plan_id,
        credits = credits + v_payment.credits,
        plan_expires_at = v_expiry,
        subscription_id = v_payment.mayar_invoice_id,
        monthly_word_quota = v_payment.word_quota + v_rollover_words,
        monthly_words_used = 0,
        max_words_per_article = v_payment.max_words_per_article,
        word_quota_period_ends_at = v_expiry
    WHERE id = v_payment.user_id
    RETURNING credits, monthly_word_quota INTO v_new_credits, v_new_monthly_word_quota;
  ELSE
    RAISE EXCEPTION 'Unsupported payment product type: %', v_payment.product_type;
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
    'rolloverWords', v_rollover_words,
    'newCredits', v_new_credits,
    'monthlyWordQuota', v_new_monthly_word_quota,
    'trialArticlesRemaining', v_new_trial_articles,
    'trialWordsRemaining', v_new_trial_words
  );
END;
$$;

REVOKE ALL ON FUNCTION settle_mayar_payment(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION settle_mayar_payment(UUID, INTEGER) TO service_role;
