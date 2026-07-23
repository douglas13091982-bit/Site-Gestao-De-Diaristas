
-- =========================================================
-- 1) PROFILES: remove leitura pública ampla, cria vitrine
-- =========================================================
DROP POLICY IF EXISTS "Profiles public read" ON public.profiles;

-- Novo SELECT restrito: dono do próprio perfil e admin
CREATE POLICY "Profiles owner read"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- Vitrine pública com apenas colunas seguras de diaristas verificadas
CREATE OR REPLACE VIEW public.public_professionals
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.full_name,
  p.profile_photo,
  p.city,
  p.city_slug,
  p.bio,
  p.rating,
  p.total_reviews,
  p.total_bookings,
  p.is_verified,
  p.is_available,
  p.profession_category,
  p.specialties,
  p.regions,
  p.neighborhoods,
  p.experience,
  p.hourly_rate
FROM public.profiles p
WHERE p.is_professional = true
  AND p.is_verified = true;

-- Precisa de policy explícita para anon/authenticated ler a view (via SELECT em profiles)
CREATE POLICY "Verified pros public listing"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (is_professional = true AND is_verified = true);

-- Concede leitura da view para anon/authenticated
GRANT SELECT ON public.public_professionals TO anon, authenticated;

-- =========================================================
-- 2) BOOKINGS: remove leitura anônima de guests
-- =========================================================
DROP POLICY IF EXISTS "Guest read booking by token" ON public.bookings;

-- =========================================================
-- 3) REVIEWS: exige booking concluído entre cliente e pro
-- =========================================================
DROP POLICY IF EXISTS "Client insert review" ON public.reviews;

CREATE POLICY "Client insert review after completed booking"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = client_id
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = reviews.booking_id
        AND b.client_id = auth.uid()
        AND b.professional_id = reviews.professional_id
        AND b.status = 'completed'
    )
  );

-- Impede que uma UPDATE (que é permitida ao próprio cliente) troque
-- booking_id/professional_id para forjar uma avaliação sem serviço.
DROP POLICY IF EXISTS "Client update own review" ON public.reviews;
CREATE POLICY "Client update own review"
  ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (
    auth.uid() = client_id
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = reviews.booking_id
        AND b.client_id = auth.uid()
        AND b.professional_id = reviews.professional_id
        AND b.status = 'completed'
    )
  );

-- Índice de unicidade: uma avaliação por (booking_id, client_id)
CREATE UNIQUE INDEX IF NOT EXISTS reviews_booking_client_unique
  ON public.reviews (booking_id, client_id);
