
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule with same name
DO $$
BEGIN
  PERFORM cron.unschedule('debt-reminders-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'debt-reminders-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--fb990850-3f8b-4251-83c6-f826e75969f7.lovable.app/api/public/hooks/debt-reminders',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
