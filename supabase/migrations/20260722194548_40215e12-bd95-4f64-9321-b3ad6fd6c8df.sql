
REVOKE EXECUTE ON FUNCTION public.notify_offer_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.distribute_booking_offers() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_offer_accepted() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
