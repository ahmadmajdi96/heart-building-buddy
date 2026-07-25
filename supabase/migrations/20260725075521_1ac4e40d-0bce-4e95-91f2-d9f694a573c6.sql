-- Case court taxonomy (Jordan)
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS court_branch text,
  ADD COLUMN IF NOT EXISTS court_level text,
  ADD COLUMN IF NOT EXISTS case_type text,
  ADD COLUMN IF NOT EXISTS governorate text,
  ADD COLUMN IF NOT EXISTS claim_value numeric(14,2),
  ADD COLUMN IF NOT EXISTS estimated_fees numeric(14,2);

-- Hearing outcome capture
ALTER TABLE public.deadlines
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS outcome_note text,
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS adjourned_to timestamptz;

-- Powers of Attorney (وكالة)
CREATE TABLE IF NOT EXISTS public.powers_of_attorney (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  reference text,
  scope text NOT NULL DEFAULT 'litigation',
  principal_name text NOT NULL,
  principal_id_number text,
  principal_address text,
  agent_name text NOT NULL,
  agent_bar_number text,
  powers text[] NOT NULL DEFAULT '{}',
  notary_office text,
  notarised_on date,
  starts_on date,
  expires_on date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.powers_of_attorney TO authenticated;
GRANT ALL ON public.powers_of_attorney TO service_role;

ALTER TABLE public.powers_of_attorney ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage powers of attorney"
  ON public.powers_of_attorney FOR ALL TO authenticated
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE TRIGGER trg_poa_touch BEFORE UPDATE ON public.powers_of_attorney
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_poa_org ON public.powers_of_attorney(org_id);
CREATE INDEX IF NOT EXISTS idx_poa_client ON public.powers_of_attorney(client_id);