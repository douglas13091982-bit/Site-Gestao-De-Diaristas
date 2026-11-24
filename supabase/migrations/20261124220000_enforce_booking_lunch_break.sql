CREATE OR REPLACE FUNCTION public.enforce_booking_shift()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.booking_date, NEW.start_time, NEW.duration_hours)
       IS NOT DISTINCT FROM (OLD.booking_date, OLD.start_time, OLD.duration_hours) THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.start_time IS NULL OR NEW.start_time NOT IN ('08:00', '08:00:00', '13:00', '13:00:00')
     OR NEW.duration_hours IS NULL OR NEW.duration_hours <= 0 OR NEW.duration_hours > 4 THEN
    RAISE EXCEPTION 'Escolha um serviço de até quatro horas no turno das 08h às 12h ou das 13h às 17h. O intervalo das 12h às 13h é reservado para almoço.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_validate_shift ON public.bookings;
CREATE TRIGGER trg_bookings_validate_shift
BEFORE INSERT OR UPDATE OF booking_date, start_time, duration_hours ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_shift();
