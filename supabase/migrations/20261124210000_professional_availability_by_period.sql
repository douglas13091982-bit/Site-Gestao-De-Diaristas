CREATE UNIQUE INDEX IF NOT EXISTS professional_availability_professional_day_uidx
ON public.professional_availability (professional_id, day_of_week);

CREATE OR REPLACE FUNCTION public.professional_can_take_slot(
  professional uuid, service_date date, service_start text, service_hours numeric
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.professional_blocked_dates d
    WHERE d.professional_id = professional AND d.blocked_date = service_date
  ) AND (
    NOT EXISTS (
      SELECT 1 FROM public.professional_availability a WHERE a.professional_id = professional
    ) OR EXISTS (
      SELECT 1 FROM public.professional_availability a
      WHERE a.professional_id = professional
        AND a.day_of_week = extract(dow FROM service_date)
        AND a.is_available = true
        AND CASE
          WHEN service_start ~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
           AND a.start_time ~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
           AND a.end_time ~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
           AND service_hours > 0
          THEN service_start::time >= a.start_time::time
           AND extract(epoch FROM service_start::time) + service_hours * 3600
               <= extract(epoch FROM a.end_time::time)
          ELSE false
        END
    )
  );
$$;

REVOKE ALL ON FUNCTION public.professional_can_take_slot(uuid, date, text, numeric) FROM PUBLIC, anon, authenticated;

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
      AND public.professional_can_take_slot(p.id, NEW.booking_date, NEW.start_time, NEW.duration_hours)
    ON CONFLICT (booking_id, professional_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_offer_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    IF OLD.status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'Esta oferta não está mais disponível.' USING ERRCODE = '23514';
    END IF;

    UPDATE public.bookings b
    SET professional_id = NEW.professional_id, status = 'confirmed', updated_at = now()
    WHERE b.id = NEW.booking_id
      AND b.professional_id IS NULL
      AND b.payment_status = 'paid'
      AND b.status = 'pending'
      AND public.professional_can_take_slot(NEW.professional_id, b.booking_date, b.start_time, b.duration_hours);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'O pedido já foi atribuído ou está fora do seu horário de atendimento.' USING ERRCODE = '23514';
    END IF;

    UPDATE public.booking_offers
    SET status = 'expired', updated_at = now()
    WHERE booking_id = NEW.booking_id AND id <> NEW.id AND status = 'pending';
    NEW.responded_at := now();
  ELSIF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    NEW.responded_at := now();
  END IF;
  RETURN NEW;
END;
$$;
