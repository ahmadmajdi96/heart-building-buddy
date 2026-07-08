-- Cases: pricing + closure
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS agreed_fee numeric,
  ADD COLUMN IF NOT EXISTS retainer_amount numeric,
  ADD COLUMN IF NOT EXISTS hourly_rate numeric,
  ADD COLUMN IF NOT EXISTS fee_currency text DEFAULT 'JOD',
  ADD COLUMN IF NOT EXISTS close_result text,
  ADD COLUMN IF NOT EXISTS close_note text,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Documents: client link
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

UPDATE public.documents d
SET client_id = c.client_id
FROM public.cases c
WHERE d.case_id = c.id AND d.client_id IS NULL AND c.client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_client_id ON public.documents(client_id);

-- Debt cases: recurrence
ALTER TABLE public.debt_cases
  ADD COLUMN IF NOT EXISTS recurrence text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recurrence_interval integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS next_recur_at date,
  ADD COLUMN IF NOT EXISTS parent_debt_case_id uuid REFERENCES public.debt_cases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_debt_cases_next_recur_at ON public.debt_cases(next_recur_at) WHERE recurrence IS NOT NULL AND recurrence <> 'none';