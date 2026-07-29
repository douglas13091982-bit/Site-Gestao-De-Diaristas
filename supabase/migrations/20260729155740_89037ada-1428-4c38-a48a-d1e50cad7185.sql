
-- Storage policies para bucket apk-releases
CREATE POLICY "APK public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'apk-releases');

CREATE POLICY "APK admin insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'apk-releases' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "APK admin update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'apk-releases' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'apk-releases' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "APK admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'apk-releases' AND public.has_role(auth.uid(), 'admin'));

-- App settings: APK metadata
INSERT INTO public.app_settings (setting_key, setting_value, setting_label, setting_type, setting_group, is_public)
VALUES
  ('apk_url', '', 'URL do APK', 'text', 'app_release', true),
  ('apk_version', '', 'Versão do APK', 'text', 'app_release', true),
  ('apk_filename', '', 'Nome do arquivo APK', 'text', 'app_release', true),
  ('apk_size_bytes', '0', 'Tamanho do APK (bytes)', 'text', 'app_release', true),
  ('apk_updated_at', '', 'Última atualização do APK', 'text', 'app_release', true),
  ('play_store_url', '', 'Link Google Play', 'text', 'app_release', true)
ON CONFLICT (setting_key) DO NOTHING;
