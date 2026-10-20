DROP POLICY IF EXISTS "Categories readable" ON public.profession_categories;
CREATE POLICY "Categories readable" ON public.profession_categories FOR SELECT USING (is_enabled = true);
DROP POLICY IF EXISTS "Specialties readable" ON public.category_specialties;
CREATE POLICY "Specialties readable" ON public.category_specialties FOR SELECT USING (is_enabled = true);
DROP POLICY IF EXISTS "Cities readable" ON public.available_cities;
CREATE POLICY "Cities readable" ON public.available_cities FOR SELECT USING (is_enabled = true);
DROP POLICY IF EXISTS "Pricing readable" ON public.pricing_packages;
CREATE POLICY "Pricing readable" ON public.pricing_packages FOR SELECT USING (is_enabled = true);