
CREATE TABLE public.case_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'associate',
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (case_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_members TO authenticated;
GRANT ALL ON public.case_members TO service_role;

ALTER TABLE public.case_members ENABLE ROW LEVEL SECURITY;

-- Helper: is this user a member of a case?
CREATE OR REPLACE FUNCTION public.is_case_member(_case_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.case_members WHERE case_id = _case_id AND user_id = _user_id
  );
$$;

-- Helper: is this user the owner of a case?
CREATE OR REPLACE FUNCTION public.is_case_owner(_case_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cases WHERE id = _case_id AND owner_id = _user_id
  );
$$;

-- Owner manages membership; members can view the list
CREATE POLICY "case owner manages members" ON public.case_members
  FOR ALL
  USING (public.is_case_owner(case_id, auth.uid()))
  WITH CHECK (public.is_case_owner(case_id, auth.uid()));

CREATE POLICY "case members can view membership" ON public.case_members
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_case_member(case_id, auth.uid()));

CREATE INDEX case_members_case_idx ON public.case_members(case_id);
CREATE INDEX case_members_user_idx ON public.case_members(user_id);

CREATE TRIGGER case_members_touch BEFORE UPDATE ON public.case_members
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Allow assigned team members to view (read-only) cases they're on
CREATE POLICY "case members can read case" ON public.cases
  FOR SELECT
  USING (public.is_case_member(id, auth.uid()));
