DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ===== 1. Enums + profiles + user_roles + has_role + handle_new_user =====
CREATE TYPE public.app_role AS ENUM ('super_admin', 'loja_admin', 'entregador', 'cliente');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by owner" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ===== Lojas + loja_entregadores + is_loja_owner =====
CREATE TABLE public.lojas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  taxa_entrega_base NUMERIC(10,2) NOT NULL DEFAULT 0,
  horario_funcionamento JSONB NOT NULL DEFAULT '{}'::jsonb,
  logo_url TEXT,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lojas_owner ON public.lojas(owner_id);
CREATE INDEX idx_lojas_slug ON public.lojas(slug);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lojas TO authenticated;
GRANT SELECT ON public.lojas TO anon;
GRANT ALL ON public.lojas TO service_role;
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dono vê sua loja" ON public.lojas FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Super admin vê todas" ON public.lojas FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Dono cria loja" ON public.lojas FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'loja_admin'));
CREATE POLICY "Dono edita sua loja" ON public.lojas FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Super admin gerencia lojas" ON public.lojas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_lojas_updated_at BEFORE UPDATE ON public.lojas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.loja_entregadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  entregador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (loja_id, entregador_id)
);
CREATE INDEX idx_le_loja ON public.loja_entregadores(loja_id);
CREATE INDEX idx_le_entregador ON public.loja_entregadores(entregador_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loja_entregadores TO authenticated;
GRANT ALL ON public.loja_entregadores TO service_role;
ALTER TABLE public.loja_entregadores ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_loja_owner(_user_id UUID, _loja_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.lojas WHERE id = _loja_id AND owner_id = _user_id) $$;

CREATE POLICY "Dono da loja vê seus entregadores" ON public.loja_entregadores FOR SELECT TO authenticated USING (public.is_loja_owner(auth.uid(), loja_id));
CREATE POLICY "Entregador vê seus vínculos" ON public.loja_entregadores FOR SELECT TO authenticated USING (auth.uid() = entregador_id);
CREATE POLICY "Super admin gerencia vínculos" ON public.loja_entregadores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ===== Pedidos =====
CREATE TYPE public.pedido_status AS ENUM ('novo','aceito','em_preparo','pronto','em_rota','entregue','cancelado');
CREATE TYPE public.forma_pagamento AS ENUM ('pix','dinheiro','cartao_credito','cartao_debito');

CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero SERIAL NOT NULL,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  cliente_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  cliente_telefone TEXT NOT NULL,
  endereco_entrega TEXT NOT NULL,
  cidade TEXT,
  complemento TEXT,
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  valor_produtos NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxa_entrega NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  forma_pagamento public.forma_pagamento NOT NULL DEFAULT 'pix',
  troco_para NUMERIC(10,2),
  status public.pedido_status NOT NULL DEFAULT 'novo',
  entregador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pedidos_loja ON public.pedidos(loja_id);
CREATE INDEX idx_pedidos_entregador ON public.pedidos(entregador_id);
CREATE INDEX idx_pedidos_status ON public.pedidos(status);
CREATE INDEX idx_pedidos_created ON public.pedidos(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO authenticated;
GRANT INSERT ON public.pedidos TO anon;
GRANT ALL ON public.pedidos TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.pedidos_numero_seq TO authenticated, anon, service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dono da loja vê pedidos" ON public.pedidos FOR SELECT TO authenticated USING (public.is_loja_owner(auth.uid(), loja_id));
CREATE POLICY "Entregador vê seus pedidos" ON public.pedidos FOR SELECT TO authenticated USING (auth.uid() = entregador_id);
CREATE POLICY "Cliente vê seus próprios pedidos" ON public.pedidos FOR SELECT TO authenticated USING (auth.uid() = cliente_user_id);
CREATE POLICY "Super admin vê pedidos" ON public.pedidos FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Cliente cria pedido (auth)" ON public.pedidos FOR INSERT TO authenticated WITH CHECK (cliente_user_id IS NULL OR auth.uid() = cliente_user_id);
CREATE POLICY "Cliente cria pedido (anon)" ON public.pedidos FOR INSERT TO anon WITH CHECK (cliente_user_id IS NULL);
CREATE POLICY "Dono atualiza pedido da loja" ON public.pedidos FOR UPDATE TO authenticated USING (public.is_loja_owner(auth.uid(), loja_id)) WITH CHECK (public.is_loja_owner(auth.uid(), loja_id));
CREATE TRIGGER trg_pedidos_updated_at BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;

-- ===== Tarifas globais (tipo_veiculo) =====
CREATE TYPE public.tipo_veiculo AS ENUM ('moto','carro','caminhonete');
CREATE TABLE public.tarifas_globais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_veiculo public.tipo_veiculo NOT NULL,
  faixa_km_min NUMERIC(6,2) NOT NULL DEFAULT 0,
  faixa_km_max NUMERIC(6,2) NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  valor_minimo NUMERIC NOT NULL DEFAULT 0,
  valor_por_km NUMERIC NOT NULL DEFAULT 0,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tarifas_veiculo ON public.tarifas_globais(tipo_veiculo);
GRANT SELECT ON public.tarifas_globais TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.tarifas_globais TO authenticated;
GRANT ALL ON public.tarifas_globais TO service_role;
ALTER TABLE public.tarifas_globais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tarifas ativas são visíveis" ON public.tarifas_globais FOR SELECT TO authenticated, anon USING (ativa = true);
CREATE POLICY "Super admin gerencia tarifas" ON public.tarifas_globais FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_tarifas_updated_at BEFORE UPDATE ON public.tarifas_globais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE POLICY "Super admin vê todos profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- ===== Funções de busca =====
CREATE OR REPLACE FUNCTION public.buscar_entregador(termo text)
RETURNS TABLE (id uuid, full_name text, phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.phone
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'entregador'::public.app_role
  WHERE public.has_role(auth.uid(), 'loja_admin'::public.app_role)
    AND termo IS NOT NULL AND length(trim(termo)) >= 3
    AND (p.phone = termo OR p.full_name ILIKE '%' || termo || '%')
  LIMIT 20;
$$;
GRANT EXECUTE ON FUNCTION public.buscar_entregador(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.listar_entregadores_loja(_loja_id uuid)
RETURNS TABLE (vinculo_id uuid, ativo boolean, created_at timestamptz, entregador_id uuid, full_name text, phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT le.id, le.ativo, le.created_at, le.entregador_id, p.full_name, p.phone
  FROM public.loja_entregadores le
  LEFT JOIN public.profiles p ON p.id = le.entregador_id
  WHERE le.loja_id = _loja_id AND public.is_loja_owner(auth.uid(), _loja_id)
  ORDER BY le.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.listar_entregadores_loja(uuid) TO authenticated;

-- ===== Códigos coleta/entrega + status coletado + endereco_coleta =====
ALTER TABLE public.pedidos ADD COLUMN endereco_coleta text;
ALTER TYPE public.pedido_status ADD VALUE 'coletado' BEFORE 'entregue';