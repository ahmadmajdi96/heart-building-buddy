
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS judge text,
  ADD COLUMN IF NOT EXISTS opposing_party text,
  ADD COLUMN IF NOT EXISTS opposing_counsel text,
  ADD COLUMN IF NOT EXISTS court_room text,
  ADD COLUMN IF NOT EXISTS responsible_lawyer uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en';

-- Auto-mark overdue invoices when due_date is past and still issued/partial
CREATE OR REPLACE FUNCTION public.mark_invoices_overdue()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.tax_invoices
  SET status = 'overdue'
  WHERE due_date IS NOT NULL
    AND due_date < CURRENT_DATE
    AND status IN ('issued', 'partial');
$$;

REVOKE EXECUTE ON FUNCTION public.mark_invoices_overdue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_invoices_overdue() TO authenticated, service_role;
