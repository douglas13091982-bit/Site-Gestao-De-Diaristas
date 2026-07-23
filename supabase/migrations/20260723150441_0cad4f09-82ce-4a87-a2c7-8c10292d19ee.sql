
-- Remove política pública ampla
DROP POLICY IF EXISTS "Reviews readable" ON public.reviews;

-- Somente o dono da avaliação pode ler a linha completa (que contém client_email)
CREATE POLICY "Client reads own review"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

-- Revoga qualquer SELECT direto na tabela para roles públicas
REVOKE SELECT ON public.reviews FROM anon, authenticated;
GRANT INSERT, UPDATE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO authenticated; -- necessário para a policy acima
GRANT ALL ON public.reviews TO service_role;

-- View pública sem dados sensíveis do cliente
CREATE OR REPLACE VIEW public.public_reviews
WITH (security_invoker = true) AS
SELECT id, booking_id, professional_id, rating, comment, created_at
FROM public.reviews;

GRANT SELECT ON public.public_reviews TO anon, authenticated;
