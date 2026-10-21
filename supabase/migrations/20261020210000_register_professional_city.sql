-- Cadastro de cidades brasileiras por profissionais autenticadas.
-- A cidade é criada inativa. A ativação depende da aprovação da primeira profissional.
CREATE OR REPLACE FUNCTION public.register_professional_city(
  p_name text, p_state text, p_slug text
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id bigint;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;
  IF length(trim(p_name)) NOT BETWEEN 2 AND 80
     OR p_state !~ '^[A-Z]{2}$'
     OR p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     OR length(p_slug) > 80 THEN
    RAISE EXCEPTION 'Cidade ou UF inválida';
  END IF;
  SELECT id INTO v_id FROM public.available_cities
    WHERE slug = p_slug AND state = p_state LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  INSERT INTO public.available_cities (name, state, slug, is_enabled, display_order)
  VALUES (trim(p_name), p_state, p_slug, false, 999)
  ON CONFLICT DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.available_cities
      WHERE slug = p_slug AND state = p_state LIMIT 1;
  END IF;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Não foi possível registrar a cidade'; END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.register_professional_city(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_professional_city(text,text,text) TO authenticated;
