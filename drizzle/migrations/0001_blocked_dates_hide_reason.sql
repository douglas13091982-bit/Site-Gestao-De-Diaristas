DROP POLICY IF EXISTS "Blocked readable" ON public.professional_blocked_dates;
CREATE POLICY "Admins read blocked" ON public.professional_blocked_dates FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.get_professional_blocked_dates(_pro uuid)
RETURNS TABLE(blocked_date date) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.blocked_date FROM public.professional_blocked_dates b WHERE b.professional_id = _pro;
$$;
GRANT EXECUTE ON FUNCTION public.get_professional_blocked_dates(uuid) TO anon, authenticated;