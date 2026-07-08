
-- ============================================
-- Phase 4: Expenses + Prebills
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.expense_kind AS ENUM ('court_fee','expert','translation','filing','travel','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.expense_status AS ENUM ('wip','billed','written_off','non_billable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.prebill_status AS ENUM ('draft','approved','billed','void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  kind public.expense_kind NOT NULL DEFAULT 'other',
  description text,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'JOD',
  incurred_on date NOT NULL DEFAULT CURRENT_DATE,
  billable boolean NOT NULL DEFAULT true,
  status public.expense_status NOT NULL DEFAULT 'wip',
  invoice_id uuid REFERENCES public.tax_invoices(id) ON DELETE SET NULL,
  receipt_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_org_read" ON public.expenses
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "expenses_org_write" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "expenses_org_update" ON public.expenses
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "expenses_org_delete" ON public.expenses
  FOR DELETE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

CREATE TRIGGER expenses_touch_updated
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER expenses_set_currency
  BEFORE INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_currency_from_org();

CREATE INDEX IF NOT EXISTS expenses_org_idx ON public.expenses(org_id);
CREATE INDEX IF NOT EXISTS expenses_case_idx ON public.expenses(case_id);
CREATE INDEX IF NOT EXISTS expenses_client_idx ON public.expenses(client_id);
CREATE INDEX IF NOT EXISTS expenses_status_idx ON public.expenses(status);

-- ------------------------------------------------------------
-- Prebills
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.prebills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status public.prebill_status NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'JOD',
  subtotal_time numeric(14,2) NOT NULL DEFAULT 0,
  subtotal_expenses numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  narrative text,
  approved_by uuid,
  approved_at timestamptz,
  invoice_id uuid REFERENCES public.tax_invoices(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prebills TO authenticated;
GRANT ALL ON public.prebills TO service_role;

ALTER TABLE public.prebills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prebills_org_read" ON public.prebills
  FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "prebills_org_write" ON public.prebills
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "prebills_org_update" ON public.prebills
  FOR UPDATE TO authenticated USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "prebills_org_delete" ON public.prebills
  FOR DELETE TO authenticated USING (public.is_org_member(org_id, auth.uid()));

CREATE TRIGGER prebills_touch_updated
  BEFORE UPDATE ON public.prebills
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER prebills_set_currency
  BEFORE INSERT ON public.prebills
  FOR EACH ROW EXECUTE FUNCTION public.set_currency_from_org();

CREATE INDEX IF NOT EXISTS prebills_org_idx ON public.prebills(org_id);
CREATE INDEX IF NOT EXISTS prebills_case_idx ON public.prebills(case_id);
CREATE INDEX IF NOT EXISTS prebills_status_idx ON public.prebills(status);

-- ------------------------------------------------------------
-- Prebill line items
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.prebill_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prebill_id uuid NOT NULL REFERENCES public.prebills(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('time','expense')),
  time_entry_id uuid REFERENCES public.time_entries(id) ON DELETE SET NULL,
  expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  description text,
  quantity numeric(14,2) NOT NULL DEFAULT 0,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  included boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prebill_lines TO authenticated;
GRANT ALL ON public.prebill_lines TO service_role;

ALTER TABLE public.prebill_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prebill_lines_org_read" ON public.prebill_lines
  FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "prebill_lines_org_write" ON public.prebill_lines
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "prebill_lines_org_update" ON public.prebill_lines
  FOR UPDATE TO authenticated USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "prebill_lines_org_delete" ON public.prebill_lines
  FOR DELETE TO authenticated USING (public.is_org_member(org_id, auth.uid()));

CREATE TRIGGER prebill_lines_touch_updated
  BEFORE UPDATE ON public.prebill_lines
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS prebill_lines_prebill_idx ON public.prebill_lines(prebill_id);
