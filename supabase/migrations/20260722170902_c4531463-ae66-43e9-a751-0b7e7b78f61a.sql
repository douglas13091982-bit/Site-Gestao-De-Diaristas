
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS guest_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS bookings_guest_token_idx ON public.bookings(guest_token);

GRANT SELECT, INSERT, UPDATE ON public.bookings TO anon, authenticated;
GRANT ALL ON public.bookings TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.bookings_id_seq TO anon, authenticated;

DROP POLICY IF EXISTS "Guest read booking by token" ON public.bookings;
CREATE POLICY "Guest read booking by token" ON public.bookings
  FOR SELECT TO anon
  USING (client_id IS NULL);
