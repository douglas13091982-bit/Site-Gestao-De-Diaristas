-- 1) Default de rating passa a ser 5.00
ALTER TABLE public.profiles ALTER COLUMN rating SET DEFAULT 5.00;

-- 2) Backfill: perfis sem avaliações voltam para 5
UPDATE public.profiles p
SET rating = 5.00, updated_at = now()
WHERE COALESCE(p.total_reviews, 0) = 0;

-- 3) Recalcular: quando não há avaliações, manter 5 (antes zerava)
CREATE OR REPLACE FUNCTION public.recalc_professional_rating(_pro uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.profiles p
  SET rating = COALESCE(sub.avg_rating, 5.00),
      total_reviews = COALESCE(sub.cnt, 0),
      updated_at = now()
  FROM (
    SELECT professional_id, AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*)::int AS cnt
    FROM public.reviews
    WHERE professional_id = _pro
    GROUP BY professional_id
  ) sub
  WHERE p.id = _pro
    AND (p.id = sub.professional_id OR sub.professional_id IS NULL);

  UPDATE public.profiles
  SET rating = 5.00, total_reviews = 0, updated_at = now()
  WHERE id = _pro
    AND NOT EXISTS (SELECT 1 FROM public.reviews WHERE professional_id = _pro);
$function$;