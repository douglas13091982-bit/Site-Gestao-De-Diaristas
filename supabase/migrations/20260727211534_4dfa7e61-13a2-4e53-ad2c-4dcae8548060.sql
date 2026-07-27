
CREATE TABLE public.password_reset_requests (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT,
  phone TEXT,
  is_professional BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  handled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT password_reset_requests_status_chk CHECK (status IN ('pending','sent','ignored'))
);

CREATE INDEX password_reset_requests_status_idx ON public.password_reset_requests(status, created_at DESC);

GRANT SELECT, UPDATE ON public.password_reset_requests TO authenticated;
GRANT ALL ON public.password_reset_requests TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.password_reset_requests_id_seq TO service_role;

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read reset requests"
  ON public.password_reset_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update reset requests"
  ON public.password_reset_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_password_reset_requests_updated
  BEFORE UPDATE ON public.password_reset_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
