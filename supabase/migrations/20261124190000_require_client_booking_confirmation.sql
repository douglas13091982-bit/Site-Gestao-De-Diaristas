CREATE OR REPLACE FUNCTION public.is_verified_booking_email(booking_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
      AND lower(btrim(u.email)) = lower(btrim(booking_email))
  );
$$;

REVOKE ALL ON FUNCTION public.is_verified_booking_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_verified_booking_email(text) TO authenticated;

DROP POLICY IF EXISTS "Verified guest reads own bookings" ON public.bookings;
CREATE POLICY "Verified guest reads own bookings"
ON public.bookings FOR SELECT TO authenticated
USING (client_id IS NULL AND public.is_verified_booking_email(client_email));

DROP POLICY IF EXISTS "Verified guest confirms own bookings" ON public.bookings;
CREATE POLICY "Verified guest confirms own bookings"
ON public.bookings FOR UPDATE TO authenticated
USING (
  client_id IS NULL AND status = 'awaiting_client_confirmation'
  AND public.is_verified_booking_email(client_email)
)
WITH CHECK (
  client_id IS NULL AND status = 'completed'
  AND public.is_verified_booking_email(client_email)
);

CREATE OR REPLACE FUNCTION public.enforce_booking_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  privileged boolean := coalesce(auth.role() = 'service_role', false)
    OR coalesce(public.has_role(auth.uid(), 'admin'), false);
  is_client boolean;
BEGIN
  IF NOT privileged AND NEW.client_email IS DISTINCT FROM OLD.client_email THEN
    RAISE EXCEPTION 'O e-mail do cliente não pode ser alterado no agendamento.' USING ERRCODE = '42501';
  END IF;

  IF (OLD.status IN ('in_progress', 'awaiting_client_confirmation', 'completed')
      OR NEW.status IN ('in_progress', 'awaiting_client_confirmation', 'completed'))
      AND NEW.professional_id IS DISTINCT FROM OLD.professional_id THEN
    RAISE EXCEPTION 'A profissional não pode ser alterada durante a conclusão.' USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('in_progress', 'awaiting_client_confirmation', 'completed') THEN
    IF OLD.payment_status IS DISTINCT FROM 'paid' OR OLD.professional_id IS NULL THEN
      RAISE EXCEPTION 'Aguarde a confirmação do pagamento antes de iniciar ou concluir o serviço.' USING ERRCODE = '23514';
    END IF;

    CASE NEW.status
      WHEN 'in_progress' THEN
        IF actor IS DISTINCT FROM OLD.professional_id OR OLD.status IS DISTINCT FROM 'confirmed' THEN
          RAISE EXCEPTION 'Somente a diarista pode iniciar um serviço confirmado.' USING ERRCODE = '42501';
        END IF;
      WHEN 'awaiting_client_confirmation' THEN
        IF actor IS DISTINCT FROM OLD.professional_id OR OLD.status IS DISTINCT FROM 'in_progress' THEN
          RAISE EXCEPTION 'A diarista precisa iniciar o serviço antes de concluir.' USING ERRCODE = '42501';
        END IF;
      WHEN 'completed' THEN
        is_client := actor IS NOT NULL
          AND actor IS DISTINCT FROM OLD.professional_id
          AND (actor = OLD.client_id OR (OLD.client_id IS NULL AND public.is_verified_booking_email(OLD.client_email)));
        IF is_client IS NOT TRUE OR OLD.status IS DISTINCT FROM 'awaiting_client_confirmation' THEN
          RAISE EXCEPTION 'Somente o cliente pode confirmar um serviço concluído pela diarista.' USING ERRCODE = '42501';
        END IF;
        IF to_jsonb(NEW) - 'status' IS DISTINCT FROM to_jsonb(OLD) - 'status' THEN
          RAISE EXCEPTION 'A confirmação só pode alterar o status do agendamento.' USING ERRCODE = '42501';
        END IF;
    END CASE;
  ELSIF NOT privileged AND (
    OLD.status IN ('awaiting_client_confirmation', 'completed')
    OR (OLD.status = 'in_progress' AND NEW.status IS DISTINCT FROM 'cancelled')
  ) THEN
    RAISE EXCEPTION 'Esta alteração de status não é permitida.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_enforce_completion ON public.bookings;
CREATE TRIGGER trg_bookings_enforce_completion
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_completion();

CREATE OR REPLACE FUNCTION public.validate_withdrawal_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  commission numeric;
  released numeric;
  reserved numeric;
BEGIN
  IF NEW.amount IS NULL OR NEW.amount::text IN ('NaN', 'Infinity', '-Infinity') OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Informe um valor de saque válido.' USING ERRCODE = '23514';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(NEW.professional_id::text, 0));

  SELECT CASE
    WHEN btrim(setting_value) = '' THEN 0
    WHEN btrim(setting_value) ~ '^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)([eE][+-]?[0-9]+)?$'
      THEN btrim(setting_value)::numeric
    ELSE 20
  END INTO commission
  FROM public.app_settings WHERE setting_key = 'commission_percentage';

  SELECT coalesce(sum(greatest(0, coalesce(total_price, 0) * (1 - coalesce(commission, 20) / 100))), 0)
    INTO released
  FROM public.bookings
  WHERE professional_id = NEW.professional_id AND payment_status = 'paid' AND status = 'completed';

  SELECT coalesce(sum(amount), 0) INTO reserved
  FROM public.withdrawal_requests
  WHERE professional_id = NEW.professional_id AND status IN ('pending', 'approved', 'paid');

  IF NEW.amount > round(greatest(0, released - reserved), 2) THEN
    RAISE EXCEPTION 'Valor maior que o saldo disponível para saque.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawal_validate_balance ON public.withdrawal_requests;
CREATE TRIGGER trg_withdrawal_validate_balance
BEFORE INSERT ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_withdrawal_balance();
