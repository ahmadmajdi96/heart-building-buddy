
CREATE TABLE public.deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'deadline',
  title text NOT NULL,
  description text,
  location text,
  court text,
  due_at timestamptz NOT NULL,
  reminder_days int[] NOT NULL DEFAULT ARRAY[7,3,1],
  status text NOT NULL DEFAULT 'open',
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deadlines TO authenticated;
GRANT ALL ON public.deadlines TO service_role;

ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deadlines_select_org" ON public.deadlines FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, auth.uid()));
CREATE POLICY "deadlines_insert_org" ON public.deadlines FOR INSERT TO authenticated
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id, auth.uid()) AND owner_id = auth.uid());
CREATE POLICY "deadlines_update_org" ON public.deadlines FOR UPDATE TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, auth.uid()))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id, auth.uid()));
CREATE POLICY "deadlines_delete_org" ON public.deadlines FOR DELETE TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, auth.uid()));

CREATE TRIGGER deadlines_touch BEFORE UPDATE ON public.deadlines
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX deadlines_org_due_idx ON public.deadlines(org_id, due_at);
CREATE INDEX deadlines_case_idx ON public.deadlines(case_id);

-- Activity log (US-030)
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  entity_type text NOT NULL,
  entity_id uuid,
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  action text NOT NULL,
  summary text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_select_org" ON public.activity_log FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id, auth.uid()));
CREATE POLICY "activity_insert_org" ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id, auth.uid()) AND actor_id = auth.uid());
-- No UPDATE/DELETE policies: activity log is append-only for normal users.

CREATE INDEX activity_org_created_idx ON public.activity_log(org_id, created_at DESC);
CREATE INDEX activity_case_idx ON public.activity_log(case_id);
CREATE INDEX activity_actor_idx ON public.activity_log(actor_id);

-- Document category field (Block 4, US-012)
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS category text;
CREATE INDEX IF NOT EXISTS documents_category_idx ON public.documents(category);
