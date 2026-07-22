
-- Auto-distribute quick bookings to matching professionals as leads
CREATE OR REPLACE FUNCTION public.distribute_booking_offers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.professional_id IS NULL AND NEW.status = 'pending' THEN
    INSERT INTO public.booking_offers (booking_id, professional_id, status, notified_at)
    SELECT NEW.id, p.id, 'pending', now()
    FROM public.profiles p
    WHERE p.is_professional = true
      AND p.is_available = true
      AND (NEW.city_slug IS NULL OR p.city_slug = NEW.city_slug)
    ON CONFLICT (booking_id, professional_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_distribute_offers ON public.bookings;
CREATE TRIGGER trg_distribute_offers
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.distribute_booking_offers();

-- When a professional accepts a lead, assign the booking to them and cancel other pending offers
CREATE OR REPLACE FUNCTION public.on_offer_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    UPDATE public.bookings
      SET professional_id = NEW.professional_id,
          status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
          updated_at = now()
      WHERE id = NEW.booking_id AND professional_id IS NULL;
    UPDATE public.booking_offers
      SET status = 'expired', updated_at = now()
      WHERE booking_id = NEW.booking_id AND id <> NEW.id AND status = 'pending';
    NEW.responded_at := now();
  ELSIF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    NEW.responded_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_offer_accepted ON public.booking_offers;
CREATE TRIGGER trg_offer_accepted
BEFORE UPDATE ON public.booking_offers
FOR EACH ROW EXECUTE FUNCTION public.on_offer_accepted();
