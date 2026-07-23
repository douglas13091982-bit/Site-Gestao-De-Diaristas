
-- Remove a policy que ainda deixava linhas inteiras de pros verificados
-- visíveis (com PII) para qualquer visitante/autenticado.
DROP POLICY IF EXISTS "Verified pros public listing" ON public.profiles;

-- Recria a view com security_invoker=false para bypassar RLS e devolver
-- apenas colunas seguras dos profissionais verificados.
DROP VIEW IF EXISTS public.public_professionals;

CREATE VIEW public.public_professionals
WITH (security_invoker = false) AS
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

ALTER VIEW public.public_professionals OWNER TO postgres;
GRANT SELECT ON public.public_professionals TO anon, authenticated;

-- Também é preciso permitir SELECT na policy `Profiles owner read`
-- para authenticated (já criada) — nada a fazer aqui, só reafirmando.
