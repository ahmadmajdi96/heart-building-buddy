
CREATE TABLE public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  debt_case_id uuid REFERENCES public.debt_cases(id) ON DELETE SET NULL,
  context text NOT NULL DEFAULT 'manual',
  to_number text NOT NULL,
  from_number text NOT NULL,
  body text NOT NULL,
  twilio_sid text UNIQUE,
  status text NOT NULL DEFAULT 'queued',
  error_code text,
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sms_messages_owner_idx ON public.sms_messages(owner_id, sent_at DESC);
CREATE INDEX sms_messages_client_idx ON public.sms_messages(client_id, sent_at DESC);
CREATE INDEX sms_messages_case_idx ON public.sms_messages(case_id, sent_at DESC);
CREATE INDEX sms_messages_sid_idx ON public.sms_messages(twilio_sid);

GRANT SELECT, INSERT, UPDATE ON public.sms_messages TO authenticated;
GRANT ALL ON public.sms_messages TO service_role;

ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own sms"
  ON public.sms_messages FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owner can insert own sms"
  ON public.sms_messages FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE TRIGGER sms_messages_touch
  BEFORE UPDATE ON public.sms_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
