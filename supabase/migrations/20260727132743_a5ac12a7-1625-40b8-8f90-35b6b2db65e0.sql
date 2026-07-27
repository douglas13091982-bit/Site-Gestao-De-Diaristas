CREATE OR REPLACE FUNCTION public.recalc_professional_rating(_pro uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles p
  SET rating = COALESCE(sub.avg_rating, 0),
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
  SET rating = 0, total_reviews = 0, updated_at = now()
  WHERE id = _pro
    AND NOT EXISTS (SELECT 1 FROM public.reviews WHERE professional_id = _pro);
$$;

CREATE OR REPLACE FUNCTION public.on_review_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_professional_rating(OLD.professional_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_professional_rating(NEW.professional_id);
    IF TG_OP = 'UPDATE' AND OLD.professional_id IS DISTINCT FROM NEW.professional_id THEN
      PERFORM public.recalc_professional_rating(OLD.professional_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_recalc ON public.reviews;
CREATE TRIGGER trg_reviews_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.on_review_change();

-- Recalcula agregados existentes
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT professional_id FROM public.reviews LOOP
    PERFORM public.recalc_professional_rating(r.professional_id);
  END LOOP;
END $$;