DROP POLICY IF EXISTS "APK public read" ON storage.objects;
CREATE POLICY "APK admin read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'apk-releases' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Public read professional-photos" ON storage.objects;
CREATE POLICY "Pro or admin read photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'professional-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
DROP POLICY IF EXISTS "Avail readable" ON public.professional_availability;
CREATE POLICY "Avail readable verified pros" ON public.professional_availability FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = professional_id AND p.is_professional AND p.is_verified) OR auth.uid() = professional_id OR public.has_role(auth.uid(), 'admin'));