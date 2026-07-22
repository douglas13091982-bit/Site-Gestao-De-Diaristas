
CREATE POLICY "Pro upload own photo" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'professional-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Pro update own photo" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'professional-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Pro delete own photo" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'professional-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
