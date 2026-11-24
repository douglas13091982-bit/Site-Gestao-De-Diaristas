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
    SELECT nullif(setting_value, '')::integer INTO suspension_days
    FROM public.app_settings WHERE setting_key = 'suspension_days_on_cancel';

    UPDATE public.profiles
    SET suspended_until = greatest(suspended_until, now() + make_interval(days => coalesce(suspension_days, 2))),
        updated_at = now()
    WHERE id = OLD.professional_id;

    DELETE FROM public.booking_offers WHERE booking_id = OLD.id;

    NEW.professional_id := NULL;
    NEW.booking_type := 'quick';
    NEW.status := CASE WHEN OLD.payment_status = 'paid' THEN 'pending' ELSE 'awaiting_payment' END;
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
    AND b.status IN ('pending', 'awaiting_payment', 'confirmed', 'in_progress')
  RETURNING b.status INTO next_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Este serviço não pode mais ser cancelado.' USING ERRCODE = '42501';
  END IF;

  RETURN next_status;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_professional_booking(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_professional_booking(bigint) TO authenticated;
