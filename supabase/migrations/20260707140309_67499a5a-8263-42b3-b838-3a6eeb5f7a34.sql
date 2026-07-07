-- Scope cases to a workspace (organization). Existing cases inherit the owner's first workspace.
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

UPDATE public.cases c
SET org_id = m.org_id
FROM (
  SELECT DISTINCT ON (user_id) user_id, org_id
  FROM public.organization_members
  WHERE status = 'active'
  ORDER BY user_id, created_at ASC
) m
WHERE c.org_id IS NULL AND c.owner_id = m.user_id;

CREATE INDEX IF NOT EXISTS idx_cases_org_id ON public.cases(org_id);

-- Broaden read/edit so any active org member can see workspace cases.
DROP POLICY IF EXISTS "Org members can view workspace cases" ON public.cases;
CREATE POLICY "Org members can view workspace cases" ON public.cases
  FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, auth.uid()));

DROP POLICY IF EXISTS "Org members can update workspace cases" ON public.cases;
CREATE POLICY "Org members can update workspace cases" ON public.cases
  FOR UPDATE TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, auth.uid()))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id, auth.uid()));