-- Trusted server-side payment operations use the Supabase service_role key.
-- Do not apply client-facing booking tamper protections to these requests:
-- otherwise payment status/provider fields are frozen and total_price may be
-- replaced with the first package matching duration instead of the selected package.
CREATE OR REPLACE FUNCTION public.bookings_sanitize_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean := false;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    is_admin := public.has_role(auth.uid(), 'admin');
  END IF;

  IF NOT is_admin THEN
    NEW.payment_status := 'pending';
    NEW.mp_payment_id := NULL;
    NEW.payment_provider_id := NULL;
    NEW.payment_qr_base64 := NULL;
    NEW.payment_pix_code := NULL;
    NEW.paid_at := NULL;
    NEW.status := COALESCE(NEW.status, 'pending');

    IF NEW.duration_hours IS NOT NULL THEN
      SELECT pp.price INTO NEW.total_price
      FROM public.pricing_packages pp
      WHERE pp.duration_hours = NEW.duration_hours::int
        AND pp.is_enabled = true
      ORDER BY pp.display_order ASC
      LIMIT 1;
    END IF;

    NEW.payment_amount := NEW.total_price;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.bookings_protect_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean := false;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    is_admin := public.has_role(auth.uid(), 'admin');
  END IF;

  IF NOT is_admin THEN
    NEW.total_price := OLD.total_price;
    NEW.payment_amount := OLD.payment_amount;
    NEW.payment_status := OLD.payment_status;
    NEW.mp_payment_id := OLD.mp_payment_id;
    NEW.payment_provider_id := OLD.payment_provider_id;
    NEW.payment_qr_base64 := OLD.payment_qr_base64;
    NEW.payment_pix_code := OLD.payment_pix_code;
    NEW.paid_at := OLD.paid_at;
    NEW.client_id := OLD.client_id;
    NEW.guest_token := OLD.guest_token;
  END IF;

  RETURN NEW;
END;
$$;
