
CREATE OR REPLACE FUNCTION public.notify_offer_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b RECORD;
BEGIN
  SELECT service_type, city, booking_date, start_time, total_price INTO b FROM public.bookings WHERE id = NEW.booking_id;
  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (
    NEW.professional_id,
    'Novo pedido disponível!',
    COALESCE(b.service_type,'Serviço') || COALESCE(' em '||b.city,'') ||
      COALESCE(' — '||to_char(b.booking_date,'DD/MM'),'') ||
      COALESCE(' às '||to_char(b.start_time,'HH24:MI'),'') ||
      COALESCE(' — R$ '||to_char(b.total_price,'FM999999990.00'),''),
    '/pro/leads'
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_offer_created ON public.booking_offers;
CREATE TRIGGER trg_notify_offer_created AFTER INSERT ON public.booking_offers
FOR EACH ROW EXECUTE FUNCTION public.notify_offer_created();

ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
