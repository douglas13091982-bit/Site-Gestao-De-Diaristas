
-- ============================================================
-- RESET public schema
-- ============================================================
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.availability CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TYPE  IF EXISTS public.app_role CASCADE;

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin','professional','client');

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  cpf TEXT,
  city TEXT,
  city_slug TEXT,
  address TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  property_type TEXT,
  profile_photo TEXT,
  -- professional fields
  is_professional BOOLEAN NOT NULL DEFAULT false,
  profession_category TEXT DEFAULT 'diarista',
  bio TEXT,
  experience TEXT,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  neighborhoods TEXT,
  regions TEXT,
  hourly_rate NUMERIC(10,2),
  pix_key TEXT,
  pix_key_type TEXT,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  total_reviews INT NOT NULL DEFAULT 0,
  total_bookings INT NOT NULL DEFAULT 0,
  credits_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_city_slug ON public.profiles(city_slug);
CREATE INDEX idx_profiles_is_professional ON public.profiles(is_professional);
CREATE INDEX idx_profiles_rating ON public.profiles(rating DESC);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- USER ROLES
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

-- ============================================================
-- AVAILABLE CITIES (public)
-- ============================================================
CREATE TABLE public.available_cities (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.available_cities TO anon, authenticated;
GRANT ALL ON public.available_cities TO service_role;
ALTER TABLE public.available_cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cities readable" ON public.available_cities FOR SELECT USING (true);
CREATE POLICY "Admins manage cities" ON public.available_cities FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- PROFESSION CATEGORIES + SPECIALTIES
-- ============================================================
CREATE TABLE public.profession_categories (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  min_hourly_rate NUMERIC(10,2) DEFAULT 10,
  max_hourly_rate NUMERIC(10,2) DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profession_categories TO anon, authenticated;
GRANT ALL ON public.profession_categories TO service_role;
ALTER TABLE public.profession_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories readable" ON public.profession_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.profession_categories FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.category_specialties (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES public.profession_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.category_specialties TO anon, authenticated;
GRANT ALL ON public.category_specialties TO service_role;
ALTER TABLE public.category_specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Specialties readable" ON public.category_specialties FOR SELECT USING (true);
CREATE POLICY "Admins manage specialties" ON public.category_specialties FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- PRICING PACKAGES
-- ============================================================
CREATE TABLE public.pricing_packages (
  id BIGSERIAL PRIMARY KEY,
  duration_hours INT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  start_time TEXT NOT NULL DEFAULT '09:00',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pricing_packages TO anon, authenticated;
GRANT ALL ON public.pricing_packages TO service_role;
ALTER TABLE public.pricing_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pricing readable" ON public.pricing_packages FOR SELECT USING (true);
CREATE POLICY "Admins manage pricing" ON public.pricing_packages FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- PROFESSIONAL AVAILABILITY + BLOCKED DATES
-- ============================================================
CREATE TABLE public.professional_availability (
  id BIGSERIAL PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_avail_pro ON public.professional_availability(professional_id);
GRANT SELECT ON public.professional_availability TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.professional_availability TO authenticated;
GRANT ALL ON public.professional_availability TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.professional_availability_id_seq TO authenticated;
ALTER TABLE public.professional_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Avail readable" ON public.professional_availability FOR SELECT USING (true);
CREATE POLICY "Pro manage own avail" ON public.professional_availability FOR ALL
  USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);

CREATE TABLE public.professional_blocked_dates (
  id BIGSERIAL PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_blocked_pro ON public.professional_blocked_dates(professional_id, blocked_date);
GRANT SELECT ON public.professional_blocked_dates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.professional_blocked_dates TO authenticated;
GRANT ALL ON public.professional_blocked_dates TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.professional_blocked_dates_id_seq TO authenticated;
ALTER TABLE public.professional_blocked_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blocked readable" ON public.professional_blocked_dates FOR SELECT USING (true);
CREATE POLICY "Pro manage own blocked" ON public.professional_blocked_dates FOR ALL
  USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE public.bookings (
  id BIGSERIAL PRIMARY KEY,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_email TEXT,
  professional_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  booking_type TEXT NOT NULL DEFAULT 'selected', -- selected | quick
  service_type TEXT,
  property_type TEXT,
  booking_date DATE,
  start_time TEXT,
  duration_hours NUMERIC(4,1),
  rooms INT,
  bathrooms INT,
  address TEXT,
  address_complement TEXT,
  city TEXT,
  city_slug TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|confirmed|in_progress|completed|cancelled
  total_price NUMERIC(10,2),
  payment_method TEXT DEFAULT 'pix',
  payment_status TEXT DEFAULT 'pending',
  mp_payment_id TEXT,
  payment_pix_code TEXT,
  payment_amount NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_client ON public.bookings(client_id);
CREATE INDEX idx_bookings_pro ON public.bookings(professional_id);
CREATE INDEX idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX idx_bookings_status ON public.bookings(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.bookings_id_seq TO authenticated;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client read own bookings" ON public.bookings FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = professional_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Client insert booking" ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = client_id OR client_id IS NULL);
CREATE POLICY "Client/pro update booking" ON public.bookings FOR UPDATE
  USING (auth.uid() = client_id OR auth.uid() = professional_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete booking" ON public.bookings FOR DELETE
  USING (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- BOOKING OFFERS (Quick booking dispatch)
-- ============================================================
CREATE TABLE public.booking_offers (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|accepted|declined|expired
  notified_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, professional_id)
);
CREATE INDEX idx_offers_pro ON public.booking_offers(professional_id, status);
GRANT SELECT, INSERT, UPDATE ON public.booking_offers TO authenticated;
GRANT ALL ON public.booking_offers TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.booking_offers_id_seq TO authenticated;
ALTER TABLE public.booking_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pro read own offers" ON public.booking_offers FOR SELECT
  USING (auth.uid() = professional_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Pro respond offer" ON public.booking_offers FOR UPDATE
  USING (auth.uid() = professional_id);

-- ============================================================
-- CREDIT TRANSACTIONS
-- ============================================================
CREATE TABLE public.credit_transactions (
  id BIGSERIAL PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- purchase|spend|refund|bonus
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  booking_id BIGINT REFERENCES public.bookings(id) ON DELETE SET NULL,
  pix_code TEXT,
  mp_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|paid|failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_credits_pro ON public.credit_transactions(professional_id, status);
GRANT SELECT, INSERT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.credit_transactions_id_seq TO authenticated;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pro read own credits" ON public.credit_transactions FOR SELECT
  USING (auth.uid() = professional_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Pro create credit tx" ON public.credit_transactions FOR INSERT
  WITH CHECK (auth.uid() = professional_id);

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE public.reviews (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT REFERENCES public.bookings(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_email TEXT,
  professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_pro ON public.reviews(professional_id);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.reviews_id_seq TO authenticated;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews readable" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Client insert review" ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Client update own review" ON public.reviews FOR UPDATE
  USING (auth.uid() = client_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifs_user ON public.notifications(user_id, is_read);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.notifications_id_seq TO authenticated;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User read own notifs" ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "User update own notifs" ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- PUSH SUBSCRIPTIONS
-- ============================================================
CREATE TABLE public.push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_user ON public.push_subscriptions(user_id);
GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.push_subscriptions_id_seq TO authenticated;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Push own" ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- APP SETTINGS (admin only reads/writes; some public keys)
-- ============================================================
CREATE TABLE public.app_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_label TEXT,
  setting_type TEXT NOT NULL DEFAULT 'text',
  setting_group TEXT NOT NULL DEFAULT 'general',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public settings readable" ON public.app_settings FOR SELECT USING (is_public = true);
CREATE POLICY "Admin manage settings" ON public.app_settings FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- BLOCKED EMAILS (admin only)
-- ============================================================
CREATE TABLE public.blocked_emails (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  reason TEXT,
  blocked_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.blocked_emails TO service_role;
GRANT SELECT ON public.blocked_emails TO authenticated;
ALTER TABLE public.blocked_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage blocked" ON public.blocked_emails FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['profiles','available_cities','profession_categories','category_specialties',
    'pricing_packages','professional_availability','professional_blocked_dates','bookings','booking_offers',
    'credit_transactions','reviews','push_subscriptions','app_settings','blocked_emails']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _role public.app_role;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'client');
  INSERT INTO public.profiles (id, email, full_name, is_professional)
  VALUES (NEW.id, NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
          _role = 'professional')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SEEDS
-- ============================================================
INSERT INTO public.available_cities (name, slug, state, display_order) VALUES
('Joinville','joinville','SC',1),('Florianópolis','florianopolis','SC',2),('Blumenau','blumenau','SC',3),
('São José','sao-jose','SC',4),('Chapecó','chapeco','SC',5),('Itajaí','itajai','SC',6),
('Criciúma','criciuma','SC',7),('Jaraguá do Sul','jaragua-do-sul','SC',8),('Palhoça','palhoca','SC',9),
('Balneário Camboriú','balneario-camboriu','SC',10),('Lages','lages','SC',11),('Brusque','brusque','SC',12),
('Tubarão','tubarao','SC',13),('São Bento do Sul','sao-bento-do-sul','SC',14),('Camboriú','camboriu','SC',15),
('Curitiba','curitiba','PR',16),('Londrina','londrina','PR',17),('Maringá','maringa','PR',18),
('Ponta Grossa','ponta-grossa','PR',19),('Cascavel','cascavel','PR',20),('São José dos Pinhais','sao-jose-dos-pinhais','PR',21),
('Foz do Iguaçu','foz-do-iguacu','PR',22),('Colombo','colombo','PR',23),
('Porto Alegre','porto-alegre','RS',24),('Caxias do Sul','caxias-do-sul','RS',25),('Pelotas','pelotas','RS',26),
('Canoas','canoas','RS',27),('Santa Maria','santa-maria','RS',28),('Gravataí','gravatai','RS',29),
('São Paulo','sao-paulo','SP',30),('Guarulhos','guarulhos','SP',31),('Campinas','campinas','SP',32),
('São Bernardo do Campo','sao-bernardo-do-campo','SP',33),('Santo André','santo-andre','SP',34),
('Osasco','osasco','SP',35),('Ribeirão Preto','ribeirao-preto','SP',36),('Sorocaba','sorocaba','SP',37),
('Rio de Janeiro','rio-de-janeiro','RJ',38),('Niterói','niteroi','RJ',39),('Nova Iguaçu','nova-iguacu','RJ',40),
('Belo Horizonte','belo-horizonte','MG',41),('Contagem','contagem','MG',42),('Uberlândia','uberlandia','MG',43),
('Salvador','salvador','BA',44),('Fortaleza','fortaleza','CE',45),('Brasília','brasilia','DF',46);

INSERT INTO public.profession_categories (slug, name, icon, description, is_enabled, display_order) VALUES
('diarista','Diarista','Sparkles','Limpeza residencial e comercial', true, 1),
('montador','Montador de Móveis','Wrench','Montagem e desmontagem de móveis', false, 2),
('marido_aluguel','Marido de Aluguel','Hammer','Pequenos reparos e serviços gerais', false, 3);

INSERT INTO public.category_specialties (category_id, name, display_order)
SELECT c.id, s.name, s.ord FROM public.profession_categories c
JOIN (VALUES
  ('diarista','Limpeza Residencial',1),('diarista','Limpeza Profunda',2),('diarista','Limpeza Comercial',3),
  ('diarista','Pós-Obra',4),('diarista','Organização',5),('diarista','Passadoria',6),('diarista','Cozinha',7),
  ('montador','Móveis de MDF',1),('montador','Armários',2),('montador','Cozinhas Planejadas',3),
  ('marido_aluguel','Reparos Elétricos',1),('marido_aluguel','Reparos Hidráulicos',2),
  ('marido_aluguel','Pintura',3),('marido_aluguel','Instalações',4),('marido_aluguel','Pequenos Reparos',5)
) s(cat, name, ord) ON c.slug = s.cat;

INSERT INTO public.pricing_packages (duration_hours, price, start_time, display_order) VALUES
(1,121.80,'09:00',1),(2,141.80,'09:00',2),(3,161.80,'09:00',3),(4,181.80,'09:00',4),
(5,201.80,'09:00',5),(6,221.80,'09:00',6),(7,241.80,'09:00',7),(8,261.80,'09:00',8);

INSERT INTO public.app_settings (setting_key, setting_value, setting_label, setting_type, setting_group, is_public) VALUES
('site_name','Gersepa Solutions','Nome do Site','text','site',true),
('site_tagline','Sua Casa Limpa e Organizada','Texto Principal','text','site',true),
('site_subtitle','Encontre profissionais de limpeza qualificados perto de você','Subtítulo','text','site',true),
('contact_phone','','Telefone','text','contact',true),
('contact_email','','Email','text','contact',true),
('social_whatsapp','5547999999999','WhatsApp','text','social',true),
('social_instagram','','Instagram','text','social',true),
('commission_percentage','20','Porcentagem de Comissão','number','system',false),
('initial_credits','50','Créditos Iniciais (R$)','number','system',false),
('mercadopago_enabled','0','Mercado Pago Ativo','boolean','payment',false),
('mercadopago_public_key','','Mercado Pago Public Key','text','payment',true),
('payment_platform','pix_manual','Plataforma de Pagamento','select','payment',false),
('pix_key','','Chave PIX','text','payment',false),
('pix_beneficiary_name','Gersepa Solutions','Nome do Beneficiário','text','payment',false);
