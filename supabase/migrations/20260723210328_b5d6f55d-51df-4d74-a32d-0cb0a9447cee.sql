GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
CREATE POLICY "Admins can view all notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update notifications" ON public.notifications;
CREATE POLICY "Admins can update notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete notifications" ON public.notifications;
CREATE POLICY "Admins can delete notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Service role can manage notifications" ON public.notifications;
CREATE POLICY "Service role can manage notifications"
ON public.notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);