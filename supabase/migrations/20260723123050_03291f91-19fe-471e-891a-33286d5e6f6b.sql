
-- Restrict public read of reviews.client_email (and client_id) to prevent PII enumeration.
-- Public can only read rating/comment/professional_id/booking_id/created_at.
REVOKE SELECT ON public.reviews FROM anon, authenticated;
GRANT SELECT (id, booking_id, professional_id, rating, comment, created_at) ON public.reviews TO anon, authenticated;
-- Owner/admin still needs full access via service role
GRANT ALL ON public.reviews TO service_role;
-- Keep insert/update grants for authenticated (RLS enforces row scope)
GRANT INSERT, UPDATE ON public.reviews TO authenticated;
