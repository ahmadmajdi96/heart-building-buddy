
-- Draft invoices (proforma) — separate from tax_invoices; can be "accepted" into a tax invoice.
CREATE TABLE public.draft_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  number text,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','accepted','rejected')),
  currency text NOT NULL DEFAULT 'USD',
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  accepted_invoice_id uuid REFERENCES public.tax_invoices(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.draft_invoices TO authenticated;
GRANT ALL ON public.draft_invoices TO service_role;

ALTER TABLE public.draft_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view drafts"
  ON public.draft_invoices FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "Org members can insert drafts"
  ON public.draft_invoices FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Org members can update drafts"
  ON public.draft_invoices FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "Org members can delete drafts"
  ON public.draft_invoices FOR DELETE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

CREATE TRIGGER trg_draft_invoices_updated_at
  BEFORE UPDATE ON public.draft_invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_draft_invoices_org ON public.draft_invoices(org_id, created_at DESC);
CREATE INDEX idx_draft_invoices_status ON public.draft_invoices(org_id, status);
