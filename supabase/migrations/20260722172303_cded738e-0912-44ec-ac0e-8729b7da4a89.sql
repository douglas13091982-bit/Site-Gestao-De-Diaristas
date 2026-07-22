
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_provider_id text,
  ADD COLUMN IF NOT EXISTS payment_qr_base64 text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS bookings_payment_provider_id_idx ON public.bookings (payment_provider_id);
