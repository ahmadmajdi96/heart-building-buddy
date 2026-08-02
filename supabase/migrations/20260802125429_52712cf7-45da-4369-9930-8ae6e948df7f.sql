ALTER TABLE public.deadlines
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS deadlines_client_id_idx ON public.deadlines(client_id);

UPDATE public.deadlines d
SET client_id = c.client_id
FROM public.cases c
WHERE d.case_id = c.id AND d.client_id IS NULL AND c.client_id IS NOT NULL;