
DROP VIEW IF EXISTS public.public_professionals;

-- Tipo de retorno seguro (sem PII)
CREATE OR REPLACE FUNCTION public.list_public_professionals(
  _city_slug text DEFAULT NULL,
  _category text DEFAULT NULL,
  _search text DEFAULT NULL,
  _limit int DEFAULT 60
)
RETURNS TABLE (
  id uuid,
  full_name text,
  profile_photo text,
  city text,
  city_slug text,
  bio text,
  rating numeric,
  total_reviews int,
  total_bookings int,
  is_verified boolean,
  is_available boolean,
  profession_category text,
  specialties text[],
  regions text,
  neighborhoods text,
  experience text,
  hourly_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.full_name, p.profile_photo, p.city, p.city_slug, p.bio,
    p.rating, p.total_reviews, p.total_bookings, p.is_verified, p.is_available,
    p.profession_category, p.specialties, p.regions, p.neighborhoods,
    p.experience, p.hourly_rate
  FROM public.profiles p
  WHERE p.is_professional = true
    AND p.is_verified = true
    AND (_city_slug IS NULL OR p.city_slug = _city_slug)
    AND (_category IS NULL OR p.profession_category = _category)
    AND (_search IS NULL OR p.full_name ILIKE '%' || _search || '%' OR p.city ILIKE '%' || _search || '%')
  ORDER BY p.rating DESC NULLS LAST, p.total_reviews DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(_limit, 200));
$$;

REVOKE ALL ON FUNCTION public.list_public_professionals(text, text, text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.list_public_professionals(text, text, text, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_professional(_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  profile_photo text,
  city text,
  city_slug text,
  bio text,
  rating numeric,
  total_reviews int,
  total_bookings int,
  is_verified boolean,
  is_available boolean,
  profession_category text,
  specialties text[],
  regions text,
  neighborhoods text,
  experience text,
  hourly_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.full_name, p.profile_photo, p.city, p.city_slug, p.bio,
    p.rating, p.total_reviews, p.total_bookings, p.is_verified, p.is_available,
    p.profession_category, p.specialties, p.regions, p.neighborhoods,
    p.experience, p.hourly_rate
  FROM public.profiles p
  WHERE p.id = _id
    AND p.is_professional = true
    AND p.is_verified = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_professional(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_professional(uuid) TO anon, authenticated;
