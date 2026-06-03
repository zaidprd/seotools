-- ============================================================
-- Subscription Reminder Cron (via pg_cron + pg_net)
-- Aktifkan pg_cron dan pg_net dulu di Supabase Dashboard:
-- Database > Extensions > cron (pg_cron) + http (pg_net)
-- ============================================================

-- Jalankan Edge Function setiap hari jam 08:00 UTC
SELECT cron.schedule(
  'subscription-reminder-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.settings.supabase_url') || '/functions/v1/subscription-reminder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  );
  $$
);

-- Untuk set app settings (jalankan sekali):
-- ALTER DATABASE postgres SET "app.settings.supabase_url" = 'https://xxxx.supabase.co';
-- ALTER DATABASE postgres SET "app.settings.service_role_key" = 'eyJhbGci...';
