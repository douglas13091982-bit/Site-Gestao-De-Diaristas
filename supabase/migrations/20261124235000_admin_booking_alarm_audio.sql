INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('admin-booking-alerts', 'admin-booking-alerts', false, 5242880, ARRAY['audio/mpeg'])
ON CONFLICT (id) DO UPDATE
SET public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS "Admins manage booking alert audio" ON storage.objects;
CREATE POLICY "Admins manage booking alert audio" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'admin-booking-alerts' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'admin-booking-alerts' AND public.has_role(auth.uid(), 'admin'));
