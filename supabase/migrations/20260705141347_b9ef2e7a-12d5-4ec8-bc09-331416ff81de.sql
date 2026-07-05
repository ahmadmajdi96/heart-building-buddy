
ALTER TABLE public.payment_schedules
  ADD COLUMN IF NOT EXISTS plan_id uuid,
  ADD COLUMN IF NOT EXISTS installment_no int,
  ADD COLUMN IF NOT EXISTS installment_count int,
  ADD COLUMN IF NOT EXISTS debt_case_id uuid REFERENCES public.debt_cases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payment_schedules_plan_id_idx ON public.payment_schedules(plan_id);
CREATE INDEX IF NOT EXISTS payment_schedules_debt_case_id_idx ON public.payment_schedules(debt_case_id);
