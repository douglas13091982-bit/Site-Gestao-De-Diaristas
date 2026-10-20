-- Ativação de cidades após aprovação da primeira profissional.
-- Aplicar no Supabase antes de habilitar a opção no painel.
ALTER TABLE public.available_cities
  ADD COLUMN IF NOT EXISTS manually_disabled boolean NOT NULL DEFAULT false;

-- Cidades inicialmente inativas continuam elegíveis para a primeira aprovação.
-- Bloqueios manuais feitos a partir desta migração usam manually_disabled.

INSERT INTO public.app_settings
 (setting_key, setting_value, setting_group, setting_type, setting_label, is_public)
VALUES
 ('auto_enable_city_first_professional', 'false', 'cities', 'boolean',
  'Liberar cidade após aprovação da primeira profissional', false)
ON CONFLICT (setting_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.enable_city_on_first_verified_professional()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_professional IS TRUE
     AND NEW.is_verified IS TRUE
     AND NEW.city_slug IS NOT NULL
     AND (TG_OP = 'INSERT'
          OR OLD.is_verified IS DISTINCT FROM NEW.is_verified
          OR OLD.city_slug IS DISTINCT FROM NEW.city_slug
          OR OLD.is_professional IS DISTINCT FROM NEW.is_professional)
     AND EXISTS (
       SELECT 1 FROM public.app_settings
       WHERE setting_key = 'auto_enable_city_first_professional'
         AND setting_value = 'true'
     )
  THEN
    UPDATE public.available_cities
       SET is_enabled = true
     WHERE slug = NEW.city_slug
       AND is_enabled = false
       AND manually_disabled = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enable_city_first_verified_professional ON public.profiles;
CREATE TRIGGER trg_enable_city_first_verified_professional
AFTER INSERT OR UPDATE OF is_verified, city_slug, is_professional ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enable_city_on_first_verified_professional();
