
CREATE POLICY "Admins manage notification images"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'notification-images' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'notification-images' AND public.has_role(auth.uid(), 'admin'));
