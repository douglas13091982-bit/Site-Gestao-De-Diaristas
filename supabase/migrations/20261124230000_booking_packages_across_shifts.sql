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
    ((service_hours <= 4 OR service_start NOT IN ('08:00', '08:00:00')) AND NOT EXISTS (
      SELECT 1 FROM public.professional_availability a WHERE a.professional_id = professional
    )) OR EXISTS (
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
           AND CASE
             WHEN service_hours > 4 AND service_start IN ('08:00', '08:00:00')
             THEN a.end_time::time >= '17:00'::time
             ELSE extract(epoch FROM service_start::time) + service_hours * 3600
                  <= extract(epoch FROM a.end_time::time)
           END
          ELSE false
        END
    )
  );
$$;

REVOKE ALL ON FUNCTION public.professional_can_take_slot(uuid, date, text, numeric) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_booking_shift()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
     OR NEW.duration_hours IS NULL OR NEW.duration_hours <= 0 OR NEW.duration_hours > 8
     OR (NEW.duration_hours > 4 AND NEW.start_time NOT IN ('08:00', '08:00:00')) THEN
    RAISE EXCEPTION 'Escolha um início às 08h ou às 13h. Pacotes acima de quatro horas começam às 08h e preservam a pausa para almoço.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.duration_hours > 4 AND NEW.professional_id IS NOT NULL
     AND NOT public.professional_can_take_slot(NEW.professional_id, NEW.booking_date, NEW.start_time, NEW.duration_hours) THEN
    RAISE EXCEPTION 'Pacotes acima de quatro horas exigem disponibilidade da profissional nos dois turnos.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
