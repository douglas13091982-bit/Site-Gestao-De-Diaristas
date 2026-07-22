-- Tornar a plataforma de pagamento ativa visível publicamente para que o front possa
-- exibir a aba correta (PIX/Cartão) no checkout.
INSERT INTO public.app_settings (setting_key, setting_value, setting_label, setting_type, setting_group, is_public)
VALUES ('payment_platform', 'mercadopago', 'Plataforma de Pagamento', 'text', 'payment', true)
ON CONFLICT (setting_key) DO UPDATE SET is_public = true, setting_group = 'payment';

-- Flags de método aceito (PIX / Cartão), ajustáveis no admin
INSERT INTO public.app_settings (setting_key, setting_value, setting_label, setting_type, setting_group, is_public)
VALUES
  ('pix_enabled', '1', 'Aceitar PIX', 'boolean', 'payment', true),
  ('card_enabled', '1', 'Aceitar Cartão de Crédito', 'boolean', 'payment', true),
  ('mp_public_key', '', 'Mercado Pago - Public Key', 'text', 'payment', true)
ON CONFLICT (setting_key) DO UPDATE SET is_public = EXCLUDED.is_public;