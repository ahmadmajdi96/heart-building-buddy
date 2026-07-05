
-- Enums
DO $$ BEGIN
  CREATE TYPE public.debt_case_status AS ENUM ('active','paid','partial','overdue','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.debt_payer_status AS ENUM ('pending','partial','paid','overdue','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.debt_type AS ENUM ('rent','loan','service','installment','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.debt_sms_kind AS ENUM ('reminder_upcoming','reminder_due','reminder_overdue','assignment','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- debt_cases
CREATE TABLE public.debt_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  debt_type public.debt_type NOT NULL DEFAULT 'other',
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  service_fee_type TEXT NOT NULL DEFAULT 'percent', -- 'percent' or 'fixed'
  service_fee_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.debt_case_status NOT NULL DEFAULT 'active',
  due_date DATE,
  forwarder_name TEXT,       -- who receives forwarded funds (landlord, lender, etc.)
  forwarder_contact TEXT,
  reference TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_debt_cases_org ON public.debt_cases(org_id);
CREATE INDEX idx_debt_cases_client ON public.debt_cases(client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.debt_cases TO authenticated;
GRANT ALL ON public.debt_cases TO service_role;
ALTER TABLE public.debt_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read debt cases" ON public.debt_cases FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "org members write debt cases" ON public.debt_cases FOR ALL TO authenticated
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE TRIGGER debt_cases_updated_at BEFORE UPDATE ON public.debt_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- debt_case_assignees
CREATE TABLE public.debt_case_assignees (
  case_id UUID NOT NULL REFERENCES public.debt_cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'collector', -- lead | collector | viewer
  phone TEXT,                              -- override phone for SMS notifications
  notify_sms BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.debt_case_assignees TO authenticated;
GRANT ALL ON public.debt_case_assignees TO service_role;
ALTER TABLE public.debt_case_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage assignees" ON public.debt_case_assignees FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.debt_cases c WHERE c.id = case_id AND public.is_org_member(c.org_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.debt_cases c WHERE c.id = case_id AND public.is_org_member(c.org_id, auth.uid())));

-- debt_case_payers (up to 25 per case, enforced by trigger)
CREATE TABLE public.debt_case_payers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.debt_cases(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,                              -- E.164
  email TEXT,
  amount_due NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date DATE,
  status public.debt_payer_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  last_reminder_sent_at TIMESTAMPTZ,
  last_reminder_kind public.debt_sms_kind,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_debt_payers_case ON public.debt_case_payers(case_id);
CREATE INDEX idx_debt_payers_due ON public.debt_case_payers(due_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.debt_case_payers TO authenticated;
GRANT ALL ON public.debt_case_payers TO service_role;
ALTER TABLE public.debt_case_payers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage payers" ON public.debt_case_payers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.debt_cases c WHERE c.id = case_id AND public.is_org_member(c.org_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.debt_cases c WHERE c.id = case_id AND public.is_org_member(c.org_id, auth.uid())));

CREATE TRIGGER debt_payers_updated_at BEFORE UPDATE ON public.debt_case_payers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_debt_payer_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM public.debt_case_payers WHERE case_id = NEW.case_id;
  IF cnt >= 25 THEN
    RAISE EXCEPTION 'Debt case cannot have more than 25 payers';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER debt_payers_limit BEFORE INSERT ON public.debt_case_payers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_debt_payer_limit();

-- debt_collection_payments (received payments split into forwarded + service fee)
CREATE TABLE public.debt_collection_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.debt_cases(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES public.debt_case_payers(id) ON DELETE SET NULL,
  amount_received NUMERIC(14,2) NOT NULL DEFAULT 0,
  service_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_forwarded NUMERIC(14,2) NOT NULL DEFAULT 0,
  forwarder_name TEXT,
  method TEXT NOT NULL DEFAULT 'bank_transfer',
  reference TEXT,
  paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  invoice_id UUID REFERENCES public.tax_invoices(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_debt_payments_org ON public.debt_collection_payments(org_id);
CREATE INDEX idx_debt_payments_case ON public.debt_collection_payments(case_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.debt_collection_payments TO authenticated;
GRANT ALL ON public.debt_collection_payments TO service_role;
ALTER TABLE public.debt_collection_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read debt payments" ON public.debt_collection_payments FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "org members write debt payments" ON public.debt_collection_payments FOR ALL TO authenticated
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE TRIGGER debt_payments_updated_at BEFORE UPDATE ON public.debt_collection_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- debt_sms_log
CREATE TABLE public.debt_sms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.debt_cases(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES public.debt_case_payers(id) ON DELETE SET NULL,
  assignee_user_id UUID,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  kind public.debt_sms_kind NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'sent', -- sent | failed | queued
  twilio_sid TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_debt_sms_case ON public.debt_sms_log(case_id);
CREATE INDEX idx_debt_sms_sent ON public.debt_sms_log(sent_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.debt_sms_log TO authenticated;
GRANT ALL ON public.debt_sms_log TO service_role;
ALTER TABLE public.debt_sms_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read sms log" ON public.debt_sms_log FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "org members write sms log" ON public.debt_sms_log FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, auth.uid()));
