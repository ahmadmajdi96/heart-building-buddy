
-- Phase 2: Currency lockdown
ALTER TABLE public.payments ALTER COLUMN currency SET DEFAULT 'JOD';
ALTER TABLE public.tax_invoices ALTER COLUMN currency SET DEFAULT 'JOD';
ALTER TABLE public.payment_schedules ALTER COLUMN currency SET DEFAULT 'JOD';

CREATE OR REPLACE FUNCTION public.set_currency_from_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _cur text;
BEGIN
  IF NEW.currency IS NULL OR NEW.currency = '' OR NEW.currency = 'USD' OR NEW.currency = 'SAR' THEN
    SELECT currency INTO _cur FROM public.organizations WHERE id = NEW.org_id;
    IF _cur IS NOT NULL AND _cur <> '' THEN NEW.currency := _cur; END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_payments_currency ON public.payments;
CREATE TRIGGER trg_payments_currency BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_currency_from_org();
DROP TRIGGER IF EXISTS trg_tax_invoices_currency ON public.tax_invoices;
CREATE TRIGGER trg_tax_invoices_currency BEFORE INSERT ON public.tax_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_currency_from_org();
DROP TRIGGER IF EXISTS trg_payment_schedules_currency ON public.payment_schedules;
CREATE TRIGGER trg_payment_schedules_currency BEFORE INSERT ON public.payment_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_currency_from_org();

-- Phase 5: Organization SMS configuration
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS sms_sender_id text,
  ADD COLUMN IF NOT EXISTS sms_quiet_hours_start time NOT NULL DEFAULT '21:00',
  ADD COLUMN IF NOT EXISTS sms_quiet_hours_end   time NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS sms_timezone text NOT NULL DEFAULT 'Asia/Amman',
  ADD COLUMN IF NOT EXISTS sms_daily_cap_per_recipient integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sms_bilingual_footer boolean NOT NULL DEFAULT true;

-- sms_opt_outs
CREATE TABLE IF NOT EXISTS public.sms_opt_outs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  phone text NOT NULL,
  reason text,
  opted_out_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (org_id, phone)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_opt_outs TO authenticated;
GRANT ALL ON public.sms_opt_outs TO service_role;
ALTER TABLE public.sms_opt_outs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_opt_outs read" ON public.sms_opt_outs
  FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "sms_opt_outs insert" ON public.sms_opt_outs
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "sms_opt_outs update" ON public.sms_opt_outs
  FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner']::org_role[]))
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner']::org_role[]));
CREATE POLICY "sms_opt_outs delete" ON public.sms_opt_outs
  FOR DELETE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner']::org_role[]));

-- sms_templates
CREATE TABLE IF NOT EXISTS public.sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL,
  language text NOT NULL CHECK (language IN ('ar','en')),
  body text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sms_templates_org_kind_lang_idx ON public.sms_templates (org_id, kind, language, is_active);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_templates TO authenticated;
GRANT ALL ON public.sms_templates TO service_role;
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_templates read" ON public.sms_templates
  FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "sms_templates write" ON public.sms_templates
  FOR ALL TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner']::org_role[]))
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','partner']::org_role[]));
DROP TRIGGER IF EXISTS trg_sms_templates_updated_at ON public.sms_templates;
CREATE TRIGGER trg_sms_templates_updated_at BEFORE UPDATE ON public.sms_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Consent + promise-to-pay + dispute columns
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_consent_source text,
  ADD COLUMN IF NOT EXISTS preferred_sms_language text CHECK (preferred_sms_language IN ('ar','en'));

ALTER TABLE public.debt_case_payers
  ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_consent_source text,
  ADD COLUMN IF NOT EXISTS promise_to_pay_date date,
  ADD COLUMN IF NOT EXISTS promise_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS promised_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS disputed_at timestamptz,
  ADD COLUMN IF NOT EXISTS opted_out_at timestamptz;

-- sms_messages extensions
ALTER TABLE public.sms_messages
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS encoding text,
  ADD COLUMN IF NOT EXISTS segment_count integer,
  ADD COLUMN IF NOT EXISTS sender_id text,
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.sms_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS blocked_reason text;

-- debtor_aging view (uses debt_case_payers.due_date and outstanding balance = amount_due - amount_paid)
CREATE OR REPLACE VIEW public.debtor_aging AS
SELECT
  p.id AS payer_id,
  p.case_id,
  dc.org_id,
  p.name,
  p.phone,
  p.status,
  (COALESCE(p.amount_due, 0) - COALESCE(p.amount_paid, 0)) AS balance,
  COALESCE(p.due_date, dc.due_date) AS due_date,
  CASE
    WHEN COALESCE(p.due_date, dc.due_date) IS NULL THEN NULL
    ELSE (CURRENT_DATE - COALESCE(p.due_date, dc.due_date))
  END AS days_overdue,
  CASE
    WHEN COALESCE(p.due_date, dc.due_date) IS NULL THEN 'current'
    WHEN CURRENT_DATE - COALESCE(p.due_date, dc.due_date) <= 0  THEN 'current'
    WHEN CURRENT_DATE - COALESCE(p.due_date, dc.due_date) <= 30 THEN '0-30'
    WHEN CURRENT_DATE - COALESCE(p.due_date, dc.due_date) <= 60 THEN '31-60'
    WHEN CURRENT_DATE - COALESCE(p.due_date, dc.due_date) <= 90 THEN '61-90'
    ELSE '90+'
  END AS bucket
FROM public.debt_case_payers p
JOIN public.debt_cases dc ON dc.id = p.case_id;

GRANT SELECT ON public.debtor_aging TO authenticated;
GRANT ALL ON public.debtor_aging TO service_role;
