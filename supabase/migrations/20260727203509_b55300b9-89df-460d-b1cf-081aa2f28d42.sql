INSERT INTO public.app_settings (setting_key, setting_value, setting_label, setting_type, setting_group, is_public)
VALUES
  ('mp_public_key', 'APP_USR-2ba24a4d-be40-4cd3-9b2d-73ca88bc352d', 'Mercado Pago - Public Key', 'text', 'payment', true),
  ('card_enabled', '1', 'Pagamento por cartão', 'text', 'payment', true),
  ('pix_enabled', '1', 'Pagamento via PIX', 'text', 'payment', true),
  ('card_max_installments', '3', 'Cartão - parcelas máximas sem juros', 'text', 'payment', true)
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value,
    setting_label = EXCLUDED.setting_label,
    setting_type = EXCLUDED.setting_type,
    setting_group = EXCLUDED.setting_group,
    is_public = EXCLUDED.is_public,
    updated_at = now();