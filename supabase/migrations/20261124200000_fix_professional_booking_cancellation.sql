CREATE OR REPLACE FUNCTION public.on_pro_cancel_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  suspension_days integer;
BEGIN
  IF NEW.status = 'cancelled'
     AND OLD.status IS DISTINCT FROM 'cancelled'
     AND OLD.professional_id IS NOT NULL
     AND auth.uid() = OLD.professional_id THEN
    IF OLD.payment_status IS DISTINCT FROM 'paid' THEN
      RAISE EXCEPTION 'Aguarde o pagamento do cliente para cancelar.' USING ERRCODE = '23514';
    END IF;

    SELECT nullif(setting_value, '')::integer INTO suspension_days
    FROM public.app_settings WHERE setting_key = 'suspension_days_on_cancel';

    UPDATE public.profiles
    SET suspended_until = greatest(suspended_until, now() + make_interval(days => coalesce(suspension_days, 2))),
        updated_at = now()
    WHERE id = OLD.professional_id;

    DELETE FROM public.booking_offers WHERE booking_id = OLD.id;

    NEW.professional_id := NULL;
    NEW.booking_type := 'quick';
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.distribute_booking_offers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.professional_id IS NULL AND NEW.status = 'pending' AND NEW.payment_status = 'paid' THEN
    INSERT INTO public.booking_offers (booking_id, professional_id, status, notified_at)
    SELECT NEW.id, p.id, 'pending', now()
    FROM public.profiles p
    WHERE p.is_professional = true
      AND p.is_available = true
      AND (p.suspended_until IS NULL OR p.suspended_until < now())
      AND (NEW.city_slug IS NULL OR p.city_slug = NEW.city_slug)
    ON CONFLICT (booking_id, professional_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_professional_booking(booking_id bigint)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  next_status text;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Faça login para cancelar um serviço.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.bookings b
  SET status = 'cancelled'
  WHERE b.id = booking_id
    AND b.professional_id = actor
    AND b.payment_status = 'paid'
    AND b.status IN ('confirmed', 'in_progress')
  RETURNING b.status INTO next_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Somente serviços pagos e em aberto podem ser cancelados pela diarista responsável.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.notifications (user_id, title, body, link)
  SELECT o.professional_id,
         'Serviço disponível',
         'Um serviço pago voltou à fila. Confira o pedido e aceite se estiver disponível.',
         '/pro/leads'
  FROM public.booking_offers o
  WHERE o.booking_id = cancel_professional_booking.booking_id AND o.status = 'pending';

  RETURN next_status;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_professional_booking(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_professional_booking(bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_paid_direct_booking()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.payment_status IS DISTINCT FROM 'paid'
     AND NEW.payment_status = 'paid'
     AND NEW.booking_type = 'direct'
     AND NEW.professional_id IS NOT NULL
     AND NEW.status IN ('pending', 'awaiting_payment') THEN
    NEW.status := 'confirmed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_sync_paid_direct ON public.bookings;
CREATE TRIGGER trg_bookings_sync_paid_direct
BEFORE UPDATE OF payment_status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.confirm_paid_direct_booking();

UPDATE public.bookings
SET status = 'confirmed'
WHERE payment_status = 'paid'
  AND booking_type = 'direct'
  AND professional_id IS NOT NULL
  AND status IN ('pending', 'awaiting_payment');
