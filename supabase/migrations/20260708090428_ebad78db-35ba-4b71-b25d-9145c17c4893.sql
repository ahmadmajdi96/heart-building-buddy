
-- ============================================================
-- Phase 1: Single ledger + derived statuses (v2)
-- ============================================================

-- 1. Extend invoice_status enum
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'sent';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'viewed';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'written_off';

-- 2. Allocation kind enum
DO $$ BEGIN
  CREATE TYPE allocation_kind AS ENUM ('invoice', 'schedule', 'retainer', 'credit_apply', 'debt_case');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. payment_allocations table
CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payment_id        uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  kind              allocation_kind NOT NULL,
  invoice_id        uuid REFERENCES public.tax_invoices(id) ON DELETE CASCADE,
  schedule_id       uuid REFERENCES public.payment_schedules(id) ON DELETE SET NULL,
  retainer_case_id  uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  debt_case_id      uuid REFERENCES public.debt_cases(id) ON DELETE SET NULL,
  credit_id         uuid,
  amount            numeric(14,2) NOT NULL CHECK (amount > 0),
  currency          text NOT NULL,
  note              text,
  created_by        uuid NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'invoice'      AND invoice_id       IS NOT NULL) OR
    (kind = 'schedule'     AND schedule_id      IS NOT NULL) OR
    (kind = 'retainer'     AND retainer_case_id IS NOT NULL) OR
    (kind = 'credit_apply' AND credit_id        IS NOT NULL) OR
    (kind = 'debt_case'    AND debt_case_id     IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS payment_allocations_payment_idx  ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS payment_allocations_invoice_idx  ON public.payment_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS payment_allocations_schedule_idx ON public.payment_allocations(schedule_id);
CREATE INDEX IF NOT EXISTS payment_allocations_debt_case_idx ON public.payment_allocations(debt_case_id);
CREATE INDEX IF NOT EXISTS payment_allocations_org_idx      ON public.payment_allocations(org_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_allocations TO authenticated;
GRANT ALL ON public.payment_allocations TO service_role;

ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org financials read allocations" ON public.payment_allocations
  FOR SELECT TO authenticated
  USING (has_org_role(org_id, auth.uid(), ARRAY['owner'::org_role, 'partner'::org_role, 'accountant'::org_role]));
CREATE POLICY "org financials write allocations" ON public.payment_allocations
  FOR INSERT TO authenticated
  WITH CHECK (has_org_role(org_id, auth.uid(), ARRAY['owner'::org_role, 'partner'::org_role, 'accountant'::org_role]));
CREATE POLICY "org financials update allocations" ON public.payment_allocations
  FOR UPDATE TO authenticated
  USING (has_org_role(org_id, auth.uid(), ARRAY['owner'::org_role, 'partner'::org_role, 'accountant'::org_role]))
  WITH CHECK (has_org_role(org_id, auth.uid(), ARRAY['owner'::org_role, 'partner'::org_role, 'accountant'::org_role]));
CREATE POLICY "org financials delete allocations" ON public.payment_allocations
  FOR DELETE TO authenticated
  USING (has_org_role(org_id, auth.uid(), ARRAY['owner'::org_role, 'partner'::org_role]));

-- 4. client_credits table
CREATE TABLE IF NOT EXISTS public.client_credits (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id         uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name       text NOT NULL,
  amount            numeric(14,2) NOT NULL CHECK (amount >= 0),
  applied_amount    numeric(14,2) NOT NULL DEFAULT 0 CHECK (applied_amount >= 0),
  currency          text NOT NULL,
  source_payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  note              text,
  created_by        uuid NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (applied_amount <= amount)
);
CREATE INDEX IF NOT EXISTS client_credits_client_idx ON public.client_credits(client_id);
CREATE INDEX IF NOT EXISTS client_credits_org_idx    ON public.client_credits(org_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_credits TO authenticated;
GRANT ALL ON public.client_credits TO service_role;

ALTER TABLE public.client_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org financials read credits" ON public.client_credits
  FOR SELECT TO authenticated
  USING (has_org_role(org_id, auth.uid(), ARRAY['owner'::org_role, 'partner'::org_role, 'accountant'::org_role]));
CREATE POLICY "org financials write credits" ON public.client_credits
  FOR INSERT TO authenticated
  WITH CHECK (has_org_role(org_id, auth.uid(), ARRAY['owner'::org_role, 'partner'::org_role, 'accountant'::org_role]));
CREATE POLICY "org financials update credits" ON public.client_credits
  FOR UPDATE TO authenticated
  USING (has_org_role(org_id, auth.uid(), ARRAY['owner'::org_role, 'partner'::org_role, 'accountant'::org_role]))
  WITH CHECK (has_org_role(org_id, auth.uid(), ARRAY['owner'::org_role, 'partner'::org_role, 'accountant'::org_role]));
CREATE POLICY "org financials delete credits" ON public.client_credits
  FOR DELETE TO authenticated
  USING (has_org_role(org_id, auth.uid(), ARRAY['owner'::org_role, 'partner'::org_role]));

CREATE TRIGGER tg_client_credits_updated
  BEFORE UPDATE ON public.client_credits
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE public.payment_allocations
  DROP CONSTRAINT IF EXISTS payment_allocations_credit_id_fkey;
ALTER TABLE public.payment_allocations
  ADD CONSTRAINT payment_allocations_credit_id_fkey
  FOREIGN KEY (credit_id) REFERENCES public.client_credits(id) ON DELETE SET NULL;

-- 5. Recompute function — cast to text to avoid new-enum-value-in-same-transaction restriction
CREATE OR REPLACE FUNCTION public.recompute_invoice_from_allocations(_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sum     numeric(14,2);
  _total   numeric(14,2);
  _due     date;
  _current text;
  _status  text;
BEGIN
  IF _invoice_id IS NULL THEN RETURN; END IF;
  SELECT COALESCE(SUM(amount), 0) INTO _sum
    FROM public.payment_allocations
    WHERE invoice_id = _invoice_id;
  SELECT total, due_date, status::text INTO _total, _due, _current
    FROM public.tax_invoices WHERE id = _invoice_id;
  IF _total IS NULL THEN RETURN; END IF;

  IF _sum <= 0 THEN
    IF _current IN ('draft','void','written_off','sent','viewed') THEN
      _status := _current;
    ELSIF _due IS NOT NULL AND _due < CURRENT_DATE THEN
      _status := 'overdue';
    ELSE
      _status := 'issued';
    END IF;
  ELSIF _sum >= _total THEN
    _status := 'paid';
  ELSE
    IF _due IS NOT NULL AND _due < CURRENT_DATE THEN
      _status := 'overdue';
    ELSE
      _status := 'partial';
    END IF;
  END IF;

  EXECUTE 'UPDATE public.tax_invoices SET amount_paid = $1, status = $2::invoice_status WHERE id = $3'
    USING LEAST(_sum, _total), _status, _invoice_id;
END $$;

CREATE OR REPLACE FUNCTION public.tg_allocations_touch_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.invoice_id IS NOT NULL THEN
      PERFORM public.recompute_invoice_from_allocations(OLD.invoice_id);
    END IF;
    RETURN OLD;
  ELSE
    IF NEW.invoice_id IS NOT NULL THEN
      PERFORM public.recompute_invoice_from_allocations(NEW.invoice_id);
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.invoice_id IS DISTINCT FROM NEW.invoice_id AND OLD.invoice_id IS NOT NULL THEN
      PERFORM public.recompute_invoice_from_allocations(OLD.invoice_id);
    END IF;
    RETURN NEW;
  END IF;
END $$;

DROP TRIGGER IF EXISTS tg_allocations_touch_invoice ON public.payment_allocations;
CREATE TRIGGER tg_allocations_touch_invoice
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.tg_allocations_touch_invoice();

CREATE OR REPLACE FUNCTION public.tg_invoice_refresh_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.due_date IS DISTINCT FROM NEW.due_date OR OLD.total IS DISTINCT FROM NEW.total) THEN
    PERFORM public.recompute_invoice_from_allocations(NEW.id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_invoice_refresh_status ON public.tax_invoices;
CREATE TRIGGER tg_invoice_refresh_status
  AFTER UPDATE ON public.tax_invoices
  FOR EACH ROW EXECUTE FUNCTION public.tg_invoice_refresh_status();

-- 6. Backfill from legacy payments
INSERT INTO public.payment_allocations (org_id, payment_id, kind, invoice_id, amount, currency, note, created_by, created_at)
SELECT p.org_id, p.id, 'invoice', p.invoice_id, p.amount, p.currency,
       COALESCE(p.notes, 'Backfill: legacy single-invoice payment'), p.created_by, p.created_at
  FROM public.payments p
  LEFT JOIN public.payment_allocations a ON a.payment_id = p.id
 WHERE p.invoice_id IS NOT NULL AND a.id IS NULL;

INSERT INTO public.payment_allocations (org_id, payment_id, kind, retainer_case_id, amount, currency, note, created_by, created_at)
SELECT p.org_id, p.id, 'retainer',
       NULLIF(replace(p.reference, 'retainer:', ''), '')::uuid,
       p.amount, p.currency, 'Backfill: retainer', p.created_by, p.created_at
  FROM public.payments p
  LEFT JOIN public.payment_allocations a ON a.payment_id = p.id
 WHERE p.invoice_id IS NULL
   AND p.reference LIKE 'retainer:%'
   AND a.id IS NULL;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.tax_invoices LOOP
    PERFORM public.recompute_invoice_from_allocations(r.id);
  END LOOP;
END $$;

-- 7. Balance view
CREATE OR REPLACE VIEW public.invoice_balances AS
SELECT i.id AS invoice_id,
       i.org_id,
       i.total,
       i.amount_paid,
       (i.total - i.amount_paid) AS balance,
       i.status,
       i.due_date
  FROM public.tax_invoices i;

GRANT SELECT ON public.invoice_balances TO authenticated;
GRANT SELECT ON public.invoice_balances TO service_role;
