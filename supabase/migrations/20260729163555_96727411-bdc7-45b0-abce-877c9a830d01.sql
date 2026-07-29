
-- 1) BOOKINGS: sanitize insert (block price/payment tampering by client/guest)
CREATE OR REPLACE FUNCTION public.bookings_sanitize_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_admin boolean := false;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    is_admin := public.has_role(auth.uid(), 'admin');
  END IF;
  IF NOT is_admin THEN
    NEW.payment_status := 'pending';
    NEW.mp_payment_id  := NULL;
    NEW.payment_provider_id := NULL;
    NEW.payment_qr_base64   := NULL;
    NEW.payment_pix_code    := NULL;
    NEW.paid_at := NULL;
    NEW.status  := COALESCE(NEW.status, 'pending');
    -- Recompute total_price from pricing_packages when duration matches a package
    IF NEW.duration_hours IS NOT NULL THEN
      SELECT pp.price INTO NEW.total_price
      FROM public.pricing_packages pp
      WHERE pp.duration_hours = NEW.duration_hours::int
        AND pp.is_enabled = true
      ORDER BY pp.display_order ASC
      LIMIT 1;
    END IF;
    -- payment_amount mirrors total_price at insert time
    NEW.payment_amount := NEW.total_price;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_bookings_sanitize_insert ON public.bookings;
CREATE TRIGGER trg_bookings_sanitize_insert
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_sanitize_insert();

-- 2) BOOKINGS: freeze sensitive columns on update for non-admin callers
CREATE OR REPLACE FUNCTION public.bookings_protect_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_admin boolean := false;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    is_admin := public.has_role(auth.uid(), 'admin');
  END IF;
  IF NOT is_admin THEN
    NEW.total_price         := OLD.total_price;
    NEW.payment_amount      := OLD.payment_amount;
    NEW.payment_status      := OLD.payment_status;
    NEW.mp_payment_id       := OLD.mp_payment_id;
    NEW.payment_provider_id := OLD.payment_provider_id;
    NEW.payment_qr_base64   := OLD.payment_qr_base64;
    NEW.payment_pix_code    := OLD.payment_pix_code;
    NEW.paid_at             := OLD.paid_at;
    NEW.client_id           := OLD.client_id;
    NEW.guest_token         := OLD.guest_token;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_bookings_protect_update ON public.bookings;
CREATE TRIGGER trg_bookings_protect_update
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_protect_update();

-- 3) CREDIT_TRANSACTIONS: block professional self-insert (system uses withdrawals now)
DROP POLICY IF EXISTS "Pro create credit tx" ON public.credit_transactions;
DROP POLICY IF EXISTS "pro_create_credit_tx" ON public.credit_transactions;
-- keep SELECT for pro; only service_role writes going forward
REVOKE INSERT ON public.credit_transactions FROM authenticated;
