CREATE OR REPLACE FUNCTION public.notify_offer_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE b RECORD;
BEGIN
  SELECT service_type, city, booking_date, start_time, total_price INTO b FROM public.bookings WHERE id = NEW.booking_id;
  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (
    NEW.professional_id,
    'Novo pedido disponível!',
    COALESCE(b.service_type,'Serviço') || COALESCE(' em '||b.city,'') ||
      COALESCE(' — '||to_char(b.booking_date::date,'DD/MM'),'') ||
      COALESCE(' às '||substring(b.start_time::text from 1 for 5),'') ||
      COALESCE(' — R$ '||to_char(b.total_price,'FM999999990.00'),''),
    '/pro/leads'
  );
  RETURN NEW;
END; $function$;