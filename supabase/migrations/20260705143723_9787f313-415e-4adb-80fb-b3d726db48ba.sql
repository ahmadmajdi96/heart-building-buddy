
-- Add 'paused' to schedule_status enum
ALTER TYPE public.schedule_status ADD VALUE IF NOT EXISTS 'paused';

-- Link payments back to a specific installment for auditability
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS schedule_id uuid REFERENCES public.payment_schedules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payments_schedule_id_idx ON public.payments(schedule_id);
CREATE INDEX IF NOT EXISTS payment_schedules_plan_id_idx ON public.payment_schedules(plan_id);
