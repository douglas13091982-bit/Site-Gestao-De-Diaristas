GRANT SELECT ON public.available_cities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.available_cities TO authenticated;
GRANT ALL ON public.available_cities TO service_role;