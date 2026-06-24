
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT '',
  activity_type TEXT NOT NULL DEFAULT 'work',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  hourly_rate NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  billable BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'logged',
  invoice_id UUID REFERENCES public.tax_invoices(id) ON DELETE SET NULL,
  is_running BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entries TO service_role;

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own time entries all" ON public.time_entries
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE INDEX time_entries_owner_idx ON public.time_entries(owner_id, started_at DESC);
CREATE INDEX time_entries_case_idx ON public.time_entries(case_id);
CREATE INDEX time_entries_client_idx ON public.time_entries(client_id);
CREATE INDEX time_entries_running_idx ON public.time_entries(owner_id, is_running) WHERE is_running = true;

CREATE TRIGGER time_entries_touch BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
