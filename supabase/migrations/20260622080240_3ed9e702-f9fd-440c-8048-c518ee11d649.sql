
-- ============ ORG & ROLES ============
CREATE TYPE public.org_type AS ENUM ('solo', 'firm');
CREATE TYPE public.org_role AS ENUM ('owner','partner','associate','paralegal','accountant','assistant');
CREATE TYPE public.member_status AS ENUM ('active','invited','disabled');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.org_type NOT NULL,
  legal_name text NOT NULL,
  display_name text,
  email text,
  phone text,
  address text,
  tax_id text,
  logo_path text,
  currency text NOT NULL DEFAULT 'SAR',
  default_tax_rate numeric(5,2) NOT NULL DEFAULT 15.00,
  invoice_prefix text NOT NULL DEFAULT 'INV',
  quote_prefix text NOT NULL DEFAULT 'QUO',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text,
  role public.org_role NOT NULL DEFAULT 'associate',
  status public.member_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (avoid recursion)
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = _org_id AND user_id = _user_id AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.org_role_of(_org_id uuid, _user_id uuid)
RETURNS public.org_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.organization_members
  WHERE org_id = _org_id AND user_id = _user_id AND status = 'active' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_org_id uuid, _user_id uuid, _roles public.org_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = _org_id AND user_id = _user_id AND status = 'active' AND role = ANY(_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_org()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.organization_members
  WHERE user_id = auth.uid() AND status = 'active'
  ORDER BY created_at ASC LIMIT 1;
$$;

-- Org policies
CREATE POLICY "members read their org" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id, auth.uid()));
CREATE POLICY "owners create orgs" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "owner/partner update org" ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_org_role(id, auth.uid(), ARRAY['owner','partner']::public.org_role[]))
  WITH CHECK (public.has_org_role(id, auth.uid(), ARRAY['owner','partner']::public.org_role[]));
CREATE POLICY "owner delete org" ON public.organizations FOR DELETE TO authenticated
  USING (public.has_org_role(id, auth.uid(), ARRAY['owner']::public.org_role[]));

-- Members policies
CREATE POLICY "members read their org members" ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY "self-insert membership on org create" ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner']::public.org_role[])
  );
CREATE POLICY "owner/partner manage members" ON public.organization_members FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner']::public.org_role[]))
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner']::public.org_role[]));
CREATE POLICY "owner/partner remove members" ON public.organization_members FOR DELETE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner']::public.org_role[]));

-- updated_at triggers (reuse touch_updated_at)
CREATE TRIGGER tg_orgs_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tg_org_members_updated BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ FINANCIALS ============
CREATE TYPE public.quote_status AS ENUM ('draft','sent','accepted','rejected','expired','converted');
CREATE TYPE public.invoice_status AS ENUM ('draft','issued','partial','paid','overdue','void');
CREATE TYPE public.schedule_status AS ENUM ('upcoming','due','paid','overdue','cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash','bank_transfer','card','cheque','other');

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  number text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  status public.quote_status NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'SAR',
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org financials read quotes" ON public.quotes FOR SELECT TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner','accountant']::public.org_role[]));
CREATE POLICY "org financials write quotes" ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner','accountant']::public.org_role[]));
CREATE POLICY "org financials update quotes" ON public.quotes FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner','accountant']::public.org_role[]))
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner','accountant']::public.org_role[]));
CREATE POLICY "org financials delete quotes" ON public.quotes FOR DELETE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner']::public.org_role[]));
CREATE TRIGGER tg_quotes_updated BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.tax_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  number text NOT NULL,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'SAR',
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_invoices TO authenticated;
GRANT ALL ON public.tax_invoices TO service_role;
ALTER TABLE public.tax_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org financials read invoices" ON public.tax_invoices FOR SELECT TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner','accountant']::public.org_role[]));
CREATE POLICY "org financials write invoices" ON public.tax_invoices FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner','accountant']::public.org_role[]));
CREATE POLICY "org financials update invoices" ON public.tax_invoices FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner','accountant']::public.org_role[]))
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner','accountant']::public.org_role[]));
CREATE POLICY "org financials delete invoices" ON public.tax_invoices FOR DELETE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner']::public.org_role[]));
CREATE TRIGGER tg_invoices_updated BEFORE UPDATE ON public.tax_invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.tax_invoices(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'SAR',
  method public.payment_method NOT NULL DEFAULT 'bank_transfer',
  reference text,
  paid_at date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org financials read payments" ON public.payments FOR SELECT TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner','accountant']::public.org_role[]));
CREATE POLICY "org financials write payments" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner','accountant']::public.org_role[]));
CREATE POLICY "org financials update payments" ON public.payments FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner','accountant']::public.org_role[]))
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner','accountant']::public.org_role[]));
CREATE POLICY "org financials delete payments" ON public.payments FOR DELETE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner']::public.org_role[]));
CREATE TRIGGER tg_payments_updated BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.tax_invoices(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  description text,
  due_date date NOT NULL,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'SAR',
  status public.schedule_status NOT NULL DEFAULT 'upcoming',
  reminder_sent_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_schedules TO authenticated;
GRANT ALL ON public.payment_schedules TO service_role;
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org financials read schedules" ON public.payment_schedules FOR SELECT TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner','accountant']::public.org_role[]));
CREATE POLICY "org financials write schedules" ON public.payment_schedules FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner','accountant']::public.org_role[]));
CREATE POLICY "org financials update schedules" ON public.payment_schedules FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner','accountant']::public.org_role[]))
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner','accountant']::public.org_role[]));
CREATE POLICY "org financials delete schedules" ON public.payment_schedules FOR DELETE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner']::public.org_role[]));
CREATE TRIGGER tg_schedules_updated BEFORE UPDATE ON public.payment_schedules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Document numbering helper (atomic; uses advisory lock per org+kind)
CREATE OR REPLACE FUNCTION public.next_doc_number(_org_id uuid, _kind text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _prefix text;
  _year text := to_char(now(), 'YYYY');
  _seq int;
  _next text;
BEGIN
  IF _kind = 'invoice' THEN
    SELECT invoice_prefix INTO _prefix FROM public.organizations WHERE id = _org_id;
    PERFORM pg_advisory_xact_lock(hashtextextended(_org_id::text || ':inv', 0));
    SELECT COALESCE(MAX(CAST(substring(number from '\d+$') AS int)), 0) + 1
      INTO _seq FROM public.tax_invoices
      WHERE org_id = _org_id AND number LIKE _prefix || '-' || _year || '-%';
  ELSE
    SELECT quote_prefix INTO _prefix FROM public.organizations WHERE id = _org_id;
    PERFORM pg_advisory_xact_lock(hashtextextended(_org_id::text || ':quo', 0));
    SELECT COALESCE(MAX(CAST(substring(number from '\d+$') AS int)), 0) + 1
      INTO _seq FROM public.quotes
      WHERE org_id = _org_id AND number LIKE _prefix || '-' || _year || '-%';
  END IF;
  _next := _prefix || '-' || _year || '-' || lpad(_seq::text, 4, '0');
  RETURN _next;
END $$;
