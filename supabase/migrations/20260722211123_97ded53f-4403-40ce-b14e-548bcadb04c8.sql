
-- Suspensão temporária da diarista
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_until timestamptz;

-- Configuração de dias de suspensão (padrão 2)
INSERT INTO public.app_settings (setting_key, setting_value, setting_label, setting_type, setting_group, is_public)
VALUES ('suspension_days_on_cancel', '2', 'Dias de suspensão ao cancelar', 'number', 'rules', true)
ON CONFLICT (setting_key) DO NOTHING;

-- Distribuição de leads ignora diaristas suspensas
CREATE OR REPLACE FUNCTION public.distribute_booking_offers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.professional_id IS NULL AND NEW.status = 'pending' THEN
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

-- Trigger de cancelamento pela diarista: suspende e redistribui
CREATE OR REPLACE FUNCTION public.on_pro_cancel_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  days int;
  pro_id uuid;
BEGIN
  IF NEW.status = 'cancelled'
     AND OLD.status IS DISTINCT FROM 'cancelled'
     AND OLD.professional_id IS NOT NULL
     AND (auth.uid() IS NULL OR auth.uid() = OLD.professional_id) THEN
    pro_id := OLD.professional_id;
    SELECT COALESCE(NULLIF(setting_value,'')::int, 2) INTO days
      FROM public.app_settings WHERE setting_key = 'suspension_days_on_cancel';
    UPDATE public.profiles
      SET suspended_until = now() + make_interval(days => COALESCE(days,2)),
          updated_at = now()
      WHERE id = pro_id;

    -- Devolve o lead ao pool e redistribui
    NEW.professional_id := NULL;
    NEW.status := 'pending';

    DELETE FROM public.booking_offers WHERE booking_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pro_cancel_booking ON public.bookings;
CREATE TRIGGER trg_pro_cancel_booking
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.on_pro_cancel_booking();

-- Trigger de distribuição on UPDATE (para redistribuir após cancelamento)
DROP TRIGGER IF EXISTS trg_distribute_booking_offers_upd ON public.bookings;
CREATE TRIGGER trg_distribute_booking_offers_upd
AFTER UPDATE ON public.bookings
FOR EACH ROW
WHEN (NEW.professional_id IS NULL AND NEW.status = 'pending')
EXECUTE FUNCTION public.distribute_booking_offers();
