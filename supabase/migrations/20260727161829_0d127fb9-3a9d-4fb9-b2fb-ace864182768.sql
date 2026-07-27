
CREATE TABLE public.withdrawal_requests (
  id BIGSERIAL PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  pix_key TEXT NOT NULL,
  pix_key_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  admin_notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_withdrawal_pro ON public.withdrawal_requests(professional_id, created_at DESC);
CREATE INDEX idx_withdrawal_status ON public.withdrawal_requests(status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.withdrawal_requests TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.withdrawal_requests_id_seq TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
GRANT ALL ON SEQUENCE public.withdrawal_requests_id_seq TO service_role;

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pro_select_own_withdrawals" ON public.withdrawal_requests
  FOR SELECT TO authenticated
  USING (professional_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "pro_insert_own_withdrawals" ON public.withdrawal_requests
  FOR INSERT TO authenticated
  WITH CHECK (professional_id = auth.uid() AND status = 'pending');

CREATE POLICY "admin_update_withdrawals" ON public.withdrawal_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_withdrawal_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.notify_admins_withdrawal_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pro_name TEXT;
BEGIN
  SELECT full_name INTO pro_name FROM public.profiles WHERE id = NEW.professional_id;
  INSERT INTO public.notifications (user_id, title, body, link)
  SELECT ur.user_id,
         'Nova solicitação de saque',
         COALESCE(pro_name, 'Diarista') || ' solicitou saque de R$ ' || to_char(NEW.amount, 'FM999999990.00'),
         '/admin/finance'
  FROM public.user_roles ur WHERE ur.role = 'admin';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_withdrawal_notify_admins
  AFTER INSERT ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_withdrawal_request();

CREATE OR REPLACE FUNCTION public.notify_pro_withdrawal_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (
      NEW.professional_id,
      CASE NEW.status
        WHEN 'approved' THEN 'Saque aprovado'
        WHEN 'paid' THEN 'Saque pago'
        WHEN 'rejected' THEN 'Saque recusado'
        ELSE 'Atualização do saque'
      END,
      'Valor: R$ ' || to_char(NEW.amount, 'FM999999990.00') ||
        COALESCE(' — ' || NEW.admin_notes, ''),
      '/pro/carteira'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_withdrawal_notify_pro
  AFTER UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_pro_withdrawal_status();

ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;
