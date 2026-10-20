CREATE OR REPLACE FUNCTION public.is_verified_professional(_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _id AND is_professional AND is_verified);
$$;
GRANT EXECUTE ON FUNCTION public.is_verified_professional(uuid) TO anon, authenticated;
DROP POLICY IF EXISTS "Avail readable verified pros" ON public.professional_availability;
CREATE POLICY "Avail readable verified pros" ON public.professional_availability FOR SELECT
  USING (public.is_verified_professional(professional_id) OR auth.uid() = professional_id OR public.has_role(auth.uid(), 'admin'));