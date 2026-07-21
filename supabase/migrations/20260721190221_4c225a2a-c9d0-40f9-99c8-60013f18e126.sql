
-- =========================================================
-- FASE 1: Reset + schema completo do app "Serviços Gersepa"
-- (portado do Mocha/D1 SQLite para Supabase Postgres)
-- =========================================================

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres;

-- ---------- Trigger util ----------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------- Roles ----------
CREATE TYPE public.app_role AS ENUM ('admin','professional','client');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles read own" ON public.user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

-- ---------- Profiles ----------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text,
  phone text,
  cpf text,
  city text,
  property_type text,
  address text,
  address_neighborhood text,
  address_number text,
  address_complement text,
  profile_photo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_city ON public.profiles(city);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid()=id) WITH CHECK (auth.uid()=id);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid()=id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para criar profile + role 'client' automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- Cidades disponíveis ----------
CREATE TABLE public.available_cities (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  state text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.available_cities TO anon, authenticated;
GRANT ALL ON public.available_cities TO service_role;
ALTER TABLE public.available_cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cities public read" ON public.available_cities FOR SELECT USING (true);
CREATE POLICY "cities admin write" ON public.available_cities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_cities_updated BEFORE UPDATE ON public.available_cities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.available_cities (name,slug,state,display_order) VALUES
('Joinville','joinville','SC',1),
('Florianópolis','florianopolis','SC',2),
('Blumenau','blumenau','SC',3),
('São José','sao-jose','SC',4),
('Chapecó','chapeco','SC',5),
('Itajaí','itajai','SC',6),
('Criciúma','criciuma','SC',7),
('Jaraguá do Sul','jaragua-do-sul','SC',8),
('Palhoça','palhoca','SC',9),
('Balneário Camboriú','balneario-camboriu','SC',10);

-- ---------- Categorias de profissão ----------
CREATE TABLE public.profession_categories (
  id bigserial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text,
  description text,
  is_enabled boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  min_hourly_rate numeric NOT NULL DEFAULT 10,
  max_hourly_rate numeric NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profession_categories TO anon, authenticated;
GRANT ALL ON public.profession_categories TO service_role;
ALTER TABLE public.profession_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cats public read" ON public.profession_categories FOR SELECT USING (true);
CREATE POLICY "cats admin write" ON public.profession_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_cats_updated BEFORE UPDATE ON public.profession_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.profession_categories (slug,name,icon,description,is_enabled,display_order) VALUES
('diarista','Diarista','Sparkles','Limpeza residencial e comercial',true,1),
('montador','Montador de Móveis','Wrench','Montagem e desmontagem de móveis',false,2),
('marido_aluguel','Marido de Aluguel','Hammer','Pequenos reparos e serviços gerais',false,3),
('pedreiro','Pedreiro','HardHat','Construção e reformas',false,4),
('servente','Servente de Pedreiro','Shovel','Auxiliar de construção',false,5),
('motorista','Motorista Particular','Car','Transporte privado',false,6),
('cuidador','Cuidador de Idoso','Heart','Cuidados com idosos',false,7),
('enfermeira','Enfermeira','Stethoscope','Cuidados de saúde',false,8),
('seguranca','Segurança','Shield','Proteção e vigilância',false,9),
('porteiro','Porteiro','DoorOpen','Controle de acesso',false,10);

CREATE TABLE public.category_specialties (
  id bigserial PRIMARY KEY,
  category_id bigint NOT NULL REFERENCES public.profession_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.category_specialties TO anon, authenticated;
GRANT ALL ON public.category_specialties TO service_role;
ALTER TABLE public.category_specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spec public read" ON public.category_specialties FOR SELECT USING (true);
CREATE POLICY "spec admin write" ON public.category_specialties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.category_specialties (category_id,name,display_order)
SELECT id, s.name, s.ord FROM public.profession_categories c
CROSS JOIN LATERAL (VALUES
  ('Limpeza Residencial',1),('Limpeza Profunda',2),('Limpeza Comercial',3),
  ('Pós-Obra',4),('Organização',5),('Passadoria',6),('Cozinha',7)
) s(name, ord) WHERE c.slug='diarista';

-- ---------- Profissionais ----------
CREATE TABLE public.professionals (
  id bigserial PRIMARY KEY,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone text,
  city text,
  cpf text,
  bio text,
  photo_url text,
  experience text,
  specialties text,
  neighborhoods text,
  regions text,
  hourly_rate numeric,
  rating numeric DEFAULT 0,
  total_reviews int NOT NULL DEFAULT 0,
  total_bookings int NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  profession_category text NOT NULL DEFAULT 'diarista',
  credits_balance numeric NOT NULL DEFAULT 0,
  pix_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_prof_city ON public.professionals(city);
CREATE INDEX idx_prof_rating ON public.professionals(rating);
CREATE INDEX idx_prof_cat ON public.professionals(profession_category);
GRANT SELECT ON public.professionals TO anon, authenticated;
GRANT INSERT, UPDATE ON public.professionals TO authenticated;
GRANT ALL ON public.professionals TO service_role;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prof public read" ON public.professionals FOR SELECT USING (true);
CREATE POLICY "prof insert self" ON public.professionals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "prof update own" ON public.professionals FOR UPDATE TO authenticated
  USING (auth.uid() = auth_user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = auth_user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "prof admin delete" ON public.professionals FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_prof_updated BEFORE UPDATE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed profissionais demo
INSERT INTO public.professionals (name,email,phone,city,bio,photo_url,experience,specialties,neighborhoods,hourly_rate,rating,total_reviews,total_bookings,is_verified,is_available,profession_category,credits_balance) VALUES
('Carla Mendes','carla.mendes@email.com','(47) 99876-5432','joinville','Profissional dedicada com mais de 6 anos de experiência.','https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop','6 anos','["Limpeza Residencial","Limpeza Profunda","Organização"]','Centro, Bucarein, América',55,4.9,89,156,true,true,'diarista',50),
('Patrícia Weber','patricia.weber@email.com','(47) 99765-4321','joinville','Diarista especializada em limpeza pós-obra e comercial.','https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop','8 anos','["Limpeza Comercial","Pós-Obra","Limpeza Profunda"]','Anita Garibaldi, Costa e Silva',65,4.8,112,203,true,true,'diarista',50),
('Fernanda Schmidt','fernanda.schmidt@email.com','(47) 99654-3210','joinville','Organização e limpeza são minha paixão!','https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200&h=200&fit=crop','5 anos','["Limpeza Residencial","Organização","Passadoria"]','Saguaçu, Bom Retiro',50,5.0,67,134,true,true,'diarista',50),
('Juliana Becker','juliana.becker@email.com','(47) 99543-2109','joinville','Limpeza com qualidade e compromisso.','https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=200&h=200&fit=crop','4 anos','["Limpeza Residencial","Cozinha","Limpeza Profunda"]','Pirabeiraba, Boa Vista',48,4.7,45,98,true,true,'diarista',50),
('Ana Santos','ana.santos@email.com','(48) 98765-4321','florianopolis','Profissional com 8 anos de experiência em limpeza residencial.','https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop','8 anos','["Limpeza Residencial","Limpeza Profunda","Organização"]','Centro, Trindade',65,4.9,127,245,true,true,'diarista',50),
('Maria Oliveira','maria.oliveira@email.com','(48) 97654-3210','florianopolis','Trabalho com amor e dedicação.','https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop','5 anos','["Limpeza Residencial","Pós-Obra"]','Ingleses, Canasvieiras',60,4.8,89,178,true,true,'diarista',50);

-- ---------- Disponibilidade e bloqueios ----------
CREATE TABLE public.professional_availability (
  id bigserial PRIMARY KEY,
  professional_id bigint NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time text NOT NULL,
  end_time text NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_avail_prof ON public.professional_availability(professional_id);
GRANT SELECT ON public.professional_availability TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.professional_availability TO authenticated;
GRANT ALL ON public.professional_availability TO service_role;
ALTER TABLE public.professional_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avail public read" ON public.professional_availability FOR SELECT USING (true);
CREATE POLICY "avail owner write" ON public.professional_availability FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.professionals p WHERE p.id=professional_id AND (p.auth_user_id=auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.professionals p WHERE p.id=professional_id AND (p.auth_user_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.professional_blocked_dates (
  id bigserial PRIMARY KEY,
  professional_id bigint NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_block_prof ON public.professional_blocked_dates(professional_id);
CREATE INDEX idx_block_date ON public.professional_blocked_dates(blocked_date);
GRANT SELECT ON public.professional_blocked_dates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.professional_blocked_dates TO authenticated;
GRANT ALL ON public.professional_blocked_dates TO service_role;
ALTER TABLE public.professional_blocked_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "block public read" ON public.professional_blocked_dates FOR SELECT USING (true);
CREATE POLICY "block owner write" ON public.professional_blocked_dates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.professionals p WHERE p.id=professional_id AND (p.auth_user_id=auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.professionals p WHERE p.id=professional_id AND (p.auth_user_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- Preencher disponibilidade padrão (seg-sex 08-17)
INSERT INTO public.professional_availability (professional_id,day_of_week,start_time,end_time,is_available)
SELECT p.id, d.dow, '08:00','17:00', d.dow BETWEEN 1 AND 5 FROM public.professionals p
CROSS JOIN generate_series(0,6) d(dow);

-- ---------- Bookings ----------
CREATE TABLE public.bookings (
  id bigserial PRIMARY KEY,
  client_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  client_email text,
  professional_id bigint REFERENCES public.professionals(id) ON DELETE SET NULL,
  service_type text,
  booking_date date,
  start_time text,
  duration_hours numeric,
  rooms int,
  bathrooms int,
  address text,
  address_complement text,
  city text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  total_price numeric,
  payment_status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL DEFAULT 'pix',
  mp_payment_id text,
  payment_pix_code text,
  payment_amount numeric,
  booking_type text NOT NULL DEFAULT 'selected',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_book_client ON public.bookings(client_user_id);
CREATE INDEX idx_book_prof ON public.bookings(professional_id);
CREATE INDEX idx_book_date ON public.bookings(booking_date);
CREATE INDEX idx_book_status ON public.bookings(status);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "book read own" ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid()=client_user_id
         OR EXISTS (SELECT 1 FROM public.professionals p WHERE p.id=professional_id AND p.auth_user_id=auth.uid())
         OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "book insert client" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid()=client_user_id);
CREATE POLICY "book update parties" ON public.bookings FOR UPDATE TO authenticated
  USING (auth.uid()=client_user_id
         OR EXISTS (SELECT 1 FROM public.professionals p WHERE p.id=professional_id AND p.auth_user_id=auth.uid())
         OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid()=client_user_id
         OR EXISTS (SELECT 1 FROM public.professionals p WHERE p.id=professional_id AND p.auth_user_id=auth.uid())
         OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_book_updated BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------- Reviews ----------
CREATE TABLE public.reviews (
  id bigserial PRIMARY KEY,
  booking_id bigint REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  client_email text,
  professional_id bigint NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rev_prof ON public.reviews(professional_id);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rev public read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "rev insert client" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid()=client_user_id);
CREATE POLICY "rev update own" ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid()=client_user_id) WITH CHECK (auth.uid()=client_user_id);

-- ---------- Créditos ----------
CREATE TABLE public.credit_transactions (
  id bigserial PRIMARY KEY,
  professional_id bigint NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric NOT NULL,
  description text,
  booking_id bigint REFERENCES public.bookings(id) ON DELETE SET NULL,
  pix_code text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ct_prof ON public.credit_transactions(professional_id);
CREATE INDEX idx_ct_status ON public.credit_transactions(status);
GRANT SELECT, INSERT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct read own" ON public.credit_transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.professionals p WHERE p.id=professional_id AND (p.auth_user_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "ct insert own" ON public.credit_transactions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.professionals p WHERE p.id=professional_id AND p.auth_user_id=auth.uid()));

-- ---------- App settings ----------
CREATE TABLE public.app_settings (
  id bigserial PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value text,
  setting_label text,
  setting_type text NOT NULL DEFAULT 'text',
  setting_group text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.app_settings FOR SELECT USING (setting_group IN ('site','contact','social'));
CREATE POLICY "settings admin read" ON public.app_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "settings admin write" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.app_settings (setting_key,setting_value,setting_label,setting_type,setting_group) VALUES
('site_name','Gersepa Solutions','Nome do Site','text','site'),
('site_logo_url','','URL da Logo','text','site'),
('site_tagline','Sua Casa Limpa e Organizada','Texto Principal','text','site'),
('site_subtitle','Encontre profissionais de limpeza qualificados perto de você','Subtítulo','text','site'),
('contact_phone','','Telefone','text','contact'),
('contact_email','','Email','text','contact'),
('contact_address','','Endereço','text','contact'),
('social_whatsapp','','WhatsApp','text','social'),
('social_instagram','','Instagram','text','social'),
('social_facebook','','Facebook','text','social'),
('commission_percentage','20','Comissão %','number','system'),
('initial_credits','50','Créditos Iniciais','number','system');

-- ---------- Pacotes de preço ----------
CREATE TABLE public.pricing_packages (
  id bigserial PRIMARY KEY,
  duration_hours int NOT NULL,
  price numeric NOT NULL,
  start_time text NOT NULL DEFAULT '09:00',
  is_enabled boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pricing_packages TO anon, authenticated;
GRANT ALL ON public.pricing_packages TO service_role;
ALTER TABLE public.pricing_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pp public read" ON public.pricing_packages FOR SELECT USING (true);
CREATE POLICY "pp admin write" ON public.pricing_packages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.pricing_packages (duration_hours,price,display_order) VALUES
(1,121.80,1),(2,141.80,2),(3,161.80,3),(4,181.80,4),
(5,201.80,5),(6,221.80,6),(7,241.80,7),(8,261.80,8);

-- ---------- Booking offers (para o "quick booking") ----------
CREATE TABLE public.booking_offers (
  id bigserial PRIMARY KEY,
  booking_id bigint NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  professional_id bigint NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  notified_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_offer_book ON public.booking_offers(booking_id);
CREATE INDEX idx_offer_prof ON public.booking_offers(professional_id);
CREATE INDEX idx_offer_status ON public.booking_offers(status);
GRANT SELECT, INSERT, UPDATE ON public.booking_offers TO authenticated;
GRANT ALL ON public.booking_offers TO service_role;
ALTER TABLE public.booking_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offer read" ON public.booking_offers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.professionals p WHERE p.id=professional_id AND p.auth_user_id=auth.uid())
         OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id=booking_id AND b.client_user_id=auth.uid())
         OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "offer update prof" ON public.booking_offers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.professionals p WHERE p.id=professional_id AND p.auth_user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.professionals p WHERE p.id=professional_id AND p.auth_user_id=auth.uid()));

-- ---------- Emails bloqueados ----------
CREATE TABLE public.blocked_emails (
  id bigserial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  reason text,
  blocked_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blocked_emails TO authenticated;
GRANT ALL ON public.blocked_emails TO service_role;
ALTER TABLE public.blocked_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocked admin read" ON public.blocked_emails FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "blocked admin write" ON public.blocked_emails FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------- Push subscriptions ----------
CREATE TABLE public.push_subscriptions (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_user ON public.push_subscriptions(user_id);
GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push own" ON public.push_subscriptions FOR ALL TO authenticated
  USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
