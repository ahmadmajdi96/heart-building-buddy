
CREATE OR REPLACE FUNCTION public.create_workspace(
  _legal_name text,
  _display_name text DEFAULT NULL,
  _type text DEFAULT 'solo',
  _currency text DEFAULT 'JOD',
  _preferred_language text DEFAULT 'en'
) RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org public.organizations;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _legal_name IS NULL OR btrim(_legal_name) = '' THEN
    RAISE EXCEPTION 'Legal name is required';
  END IF;

  INSERT INTO public.organizations (
    legal_name, display_name, type, currency, preferred_language,
    default_tax_rate, invoice_prefix, quote_prefix, created_by
  )
  VALUES (
    _legal_name,
    COALESCE(NULLIF(btrim(_display_name), ''), _legal_name),
    _type::org_type,
    _currency,
    _preferred_language,
    0,
    'INV',
    'QUO',
    _uid
  )
  RETURNING * INTO _org;

  INSERT INTO public.organization_members (org_id, user_id, role, status)
  VALUES (_org.id, _uid, 'owner', 'active');

  RETURN _org;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_workspace(text, text, text, text, text) TO authenticated;
