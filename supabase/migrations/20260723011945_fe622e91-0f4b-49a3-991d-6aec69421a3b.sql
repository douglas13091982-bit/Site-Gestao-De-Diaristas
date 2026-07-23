GRANT SELECT ON public.pricing_packages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pricing_packages TO authenticated;
GRANT ALL ON public.pricing_packages TO service_role;