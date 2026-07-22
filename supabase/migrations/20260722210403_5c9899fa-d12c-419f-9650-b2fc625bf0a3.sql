
-- Ensure commission_percentage setting exists (public so client can compute the professional's payout)
INSERT INTO public.app_settings (setting_key, setting_value, setting_label, setting_type, setting_group, is_public)
VALUES ('commission_percentage', '20', 'Comissão da plataforma (%)', 'number', 'payment', true)
ON CONFLICT (setting_key) DO UPDATE SET is_public = true, setting_label = EXCLUDED.setting_label, setting_group = EXCLUDED.setting_group, setting_type = EXCLUDED.setting_type;

-- Update lead notification to show what the professional actually receives (after commission)
CREATE OR REPLACE FUNCTION public.notify_offer_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  b RECORD;
  pct numeric;
  payout numeric;
BEGIN
  SELECT service_type, city, booking_date, start_time, total_price INTO b FROM public.bookings WHERE id = NEW.booking_id;
  SELECT COALESCE(NULLIF(setting_value,'')::numeric, 20) INTO pct FROM public.app_settings WHERE setting_key = 'commission_percentage';
  payout := COALESCE(b.total_price, 0) * (1 - COALESCE(pct,20)/100.0);

  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (
    NEW.professional_id,
    'Novo pedido disponível!',
    COALESCE(b.service_type,'Serviço') || COALESCE(' em '||b.city,'') ||
      COALESCE(' — '||to_char(b.booking_date::date,'DD/MM'),'') ||
      COALESCE(' às '||substring(b.start_time::text from 1 for 5),'') ||
      COALESCE(' — Você recebe R$ '||to_char(payout,'FM999999990.00'),''),
    '/pro/leads'
  );
  RETURN NEW;
END;
$function$;
