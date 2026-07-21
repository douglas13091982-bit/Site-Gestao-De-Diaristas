
-- Reset public schema
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'worker', 'client');
CREATE TYPE public.booking_status AS ENUM ('requested','confirmed','in_progress','completed','reviewed','cancelled');
CREATE TYPE public.transaction_status AS ENUM ('pending','paid','released','refunded','failed');

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ user_roles ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============ profiles ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  avatar_url text,
  phone text,
  bio text,
  city text,
  state text,
  address text,
  lat double precision,
  lng double precision,
  service_radius_km integer DEFAULT 10,
  rating_avg numeric(3,2) DEFAULT 0,
  rating_count integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles public read verified workers" ON public.profiles FOR SELECT
  TO anon, authenticated USING (
    is_verified = true AND public.has_role(id, 'worker')
    OR id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_profiles_city ON public.profiles(city);

-- ============ handle_new_user trigger ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _role app_role;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'client');
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ services ============
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  base_price numeric(10,2) NOT NULL CHECK (base_price >= 0),
  duration_min integer NOT NULL DEFAULT 120 CHECK (duration_min > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT SELECT ON public.services TO anon;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services public read active" ON public.services FOR SELECT
  TO anon, authenticated USING (is_active = true OR worker_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "services worker manage own" ON public.services FOR ALL
  TO authenticated USING (worker_id = auth.uid()) WITH CHECK (worker_id = auth.uid());

CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_services_worker ON public.services(worker_id);

-- ============ availability ============
CREATE TABLE public.availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_time < end_time)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability TO authenticated;
GRANT SELECT ON public.availability TO anon;
GRANT ALL ON public.availability TO service_role;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability public read" ON public.availability FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "availability worker manage own" ON public.availability FOR ALL
  TO authenticated USING (worker_id = auth.uid()) WITH CHECK (worker_id = auth.uid());
CREATE INDEX idx_avail_worker_dow ON public.availability(worker_id, day_of_week);

-- ============ bookings ============
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  duration_min integer NOT NULL DEFAULT 120,
  address text,
  lat double precision,
  lng double precision,
  status booking_status NOT NULL DEFAULT 'requested',
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  platform_fee numeric(10,2) NOT NULL DEFAULT 0,
  worker_payout numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  checkin_at timestamptz,
  checkout_at timestamptz,
  checkin_lat double precision,
  checkin_lng double precision,
  cancelled_by uuid REFERENCES public.profiles(id),
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings participants read" ON public.bookings FOR SELECT
  TO authenticated USING (
    client_id = auth.uid() OR worker_id = auth.uid() OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "bookings client insert" ON public.bookings FOR INSERT
  TO authenticated WITH CHECK (client_id = auth.uid());
CREATE POLICY "bookings participants update" ON public.bookings FOR UPDATE
  TO authenticated USING (
    client_id = auth.uid() OR worker_id = auth.uid() OR public.has_role(auth.uid(),'admin')
  );

CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_bookings_worker_time ON public.bookings(worker_id, scheduled_at);
CREATE INDEX idx_bookings_client_time ON public.bookings(client_id, scheduled_at);

-- ============ transactions ============
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'mercadopago',
  provider_ref text,
  amount numeric(10,2) NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions participants read" ON public.transactions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id
      AND (b.client_id = auth.uid() OR b.worker_id = auth.uid()))
    OR public.has_role(auth.uid(),'admin')
  );

CREATE TRIGGER trg_tx_updated BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============ reviews ============
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id, reviewer_id)
);
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews public read" ON public.reviews FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "reviews reviewer insert" ON public.reviews FOR INSERT
  TO authenticated WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id
      AND (b.client_id = auth.uid() OR b.worker_id = auth.uid())
      AND b.status IN ('completed','reviewed'))
  );

-- ============ notifications ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications own read" ON public.notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications own update" ON public.notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_notif_user_read ON public.notifications(user_id, read_at);
