
CREATE TABLE public.debt_reminder_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.debt_cases(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  offset_days INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'reminder_upcoming',
  message_template TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.debt_reminder_rules TO authenticated;
GRANT ALL ON public.debt_reminder_rules TO service_role;

ALTER TABLE public.debt_reminder_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read reminder rules"
  ON public.debt_reminder_rules FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "Org members manage reminder rules"
  ON public.debt_reminder_rules FOR ALL
  TO authenticated
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE TRIGGER trg_debt_reminder_rules_updated_at
  BEFORE UPDATE ON public.debt_reminder_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_debt_reminder_rules_case ON public.debt_reminder_rules(case_id);
