GRANT SELECT, INSERT ON public.bookings TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.bookings_id_seq TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.bookings_id_seq TO authenticated;
GRANT ALL ON public.bookings TO service_role;
GRANT ALL ON SEQUENCE public.bookings_id_seq TO service_role;