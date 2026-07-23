import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  professional_id: z.string().uuid(),
  package_id: z.number().int().optional().nullable(),
  duration_hours: z.number().int().min(1).max(12),
  total_price: z.number().positive(),
  booking_date: z.string(),
  start_time: z.string(),
  property_type: z.string().optional().nullable(),
  rooms: z.number().int().nullable().optional(),
  bathrooms: z.number().int().nullable().optional(),
  address: z.string().min(3),
  address_complement: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  city_slug: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  client_name: z.string().optional().nullable(),
  client_email: z.string().email(),
  client_phone: z.string().optional().nullable(),
  // Novos campos:
  payment_method: z.enum(["pix", "card"]).default("pix"),
  // Para Cartão (Mercado Pago) — token gerado no navegador via SDK v2:
  card_token: z.string().optional().nullable(),
  card_installments: z.number().int().min(1).max(12).optional().nullable(),
  card_payment_method_id: z.string().optional().nullable(), // ex: "visa", "master"
  card_issuer_id: z.string().optional().nullable(),
  payer_document: z.string().optional().nullable(), // CPF sem máscara
});

export const createPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: settingsRows, error: settingsErr } = await supabaseAdmin
      .from("app_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "payment_platform",
        "pix_enabled", "card_enabled",
        "mp_access_token", "mp_environment",
        "ps_token", "ps_environment",
      ]);
    if (settingsErr) throw new Error("Falha ao ler configurações de pagamento");

    const s = Object.fromEntries((settingsRows ?? []).map((r) => [r.setting_key, r.setting_value ?? ""]));
    const platform = (s.payment_platform || "mercadopago").toLowerCase();
    const method = data.payment_method;

    if (method === "pix" && s.pix_enabled === "0") throw new Error("Pagamento via PIX está desativado.");
    if (method === "card" && s.card_enabled === "0") throw new Error("Pagamento por cartão está desativado.");
    if (platform === "pagseguro" && method === "card") {
      throw new Error("Pagamento por cartão via PagSeguro ainda não está disponível. Use PIX.");
    }
    if (method === "card" && (!data.card_token || !data.card_payment_method_id)) {
      throw new Error("Token do cartão inválido. Preencha os dados novamente.");
    }

    // Create pending booking first so we have an ID for external_reference
    const { data: booking, error: bkErr } = await supabaseAdmin
      .from("bookings")
      .insert({
        client_id: data.client_id ?? null,
        client_email: data.client_email,
        client_name: data.client_name ?? null,
        client_phone: data.client_phone ?? null,
        professional_id: data.professional_id,
        booking_type: "direct",
        service_type: "diarista",
        property_type: data.property_type ?? null,
        booking_date: data.booking_date,
        start_time: data.start_time,
        duration_hours: data.duration_hours,
        rooms: data.rooms ?? null,
        bathrooms: data.bathrooms ?? null,
        address: data.address,
        address_complement: data.address_complement ?? null,
        city: data.city ?? null,
        city_slug: data.city_slug ?? null,
        notes: data.notes ?? null,
        status: "awaiting_payment",
        total_price: data.total_price,
        payment_method: method,
        payment_status: "pending",
        payment_amount: data.total_price,
      })
      .select("id, guest_token")
      .single();
    if (bkErr || !booking) throw new Error(bkErr?.message ?? "Falha ao criar agendamento");

    const [firstName, ...rest] = (data.client_name ?? "Cliente").trim().split(" ");
    const cpfDigits = (data.payer_document ?? "").replace(/\D/g, "");

    // -------------------- MERCADO PAGO --------------------
    if (platform === "mercadopago") {
      const accessToken = s.mp_access_token?.trim();
      if (!accessToken) {
        await failBooking(supabaseAdmin, booking.id);
        throw new Error("Mercado Pago não configurado. Peça ao administrador para preencher o Access Token.");
      }
      try {
      const idempotencyKey = `bk-${booking.id}-${Date.now()}`;
      const mpBody: Record<string, unknown> = {
        transaction_amount: Number(Number(data.total_price).toFixed(2)),
        description: `Agendamento Gersepa #${booking.id}`,
        external_reference: `booking:${booking.id}`,
        payer: {
          email: data.client_email,
          first_name: firstName || "Cliente",
          last_name: rest.join(" ") || "Gersepa",
          ...(cpfDigits.length === 11 ? { identification: { type: "CPF", number: cpfDigits } } : {}),
        },
      };

      if (method === "pix") {
        mpBody.payment_method_id = "pix";
      } else {
        mpBody.token = data.card_token;
        mpBody.installments = data.card_installments ?? 1;
        mpBody.payment_method_id = data.card_payment_method_id;
        if (data.card_issuer_id) mpBody.issuer_id = data.card_issuer_id;
        mpBody.capture = true;
      }

      let mpJson: {
        id?: number | string;
        status?: string;
        status_detail?: string;
        point_of_interaction?: {
          transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string };
        };
        message?: string;
        error?: string;
      } = {};
      const res = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(mpBody),
      });
      mpJson = await res.json().catch(() => ({}));
      if (!res.ok) {
        await failBooking(supabaseAdmin, booking.id);
        throw new Error(mpJson?.message ?? mpJson?.error ?? `Erro Mercado Pago (${res.status})`);
      }

      const td = mpJson.point_of_interaction?.transaction_data ?? {};
      const approved = mpJson.status === "approved";
      await supabaseAdmin
        .from("bookings")
        .update({
          payment_provider_id: mpJson.id ? String(mpJson.id) : null,
          payment_pix_code: td.qr_code ?? null,
          payment_qr_base64: td.qr_code_base64 ?? null,
          payment_status: approved ? "paid" : (mpJson.status ?? "pending"),
          status: approved ? "pending" : "awaiting_payment",
        })
        .eq("id", booking.id);

      return {
        bookingId: booking.id as number,
        guestToken: booking.guest_token as string,
        method,
        provider: "mercadopago" as const,
        status: mpJson.status ?? "pending",
        statusDetail: mpJson.status_detail ?? null,
        qrCode: td.qr_code ?? null,
        qrBase64: td.qr_code_base64 ?? null,
        ticketUrl: td.ticket_url ?? null,
      };
      } catch (e) {
        await failBooking(supabaseAdmin, booking.id);
        throw e instanceof Error ? e : new Error("Falha ao processar pagamento Mercado Pago.");
      }
    }

    // -------------------- PAGSEGURO (PIX) --------------------
    if (platform === "pagseguro") {
      const psToken = s.ps_token?.trim();
      if (!psToken) {
        await failBooking(supabaseAdmin, booking.id);
        throw new Error("PagSeguro não configurado. Peça ao administrador para preencher o Token.");
      }
      try {
      const isProd = (s.ps_environment ?? "sandbox") === "production";
      const base = isProd ? "https://api.pagseguro.com" : "https://sandbox.api.pagseguro.com";

      const cents = Math.round(Number(data.total_price) * 100);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      const payload = {
        reference_id: `booking-${booking.id}`,
        customer: {
          name: (data.client_name ?? "Cliente").slice(0, 30),
          email: data.client_email,
          tax_id: cpfDigits || "00000000000",
          phones: data.client_phone
            ? [{ country: "55", area: (data.client_phone.replace(/\D/g, "").slice(0, 2) || "11"), number: data.client_phone.replace(/\D/g, "").slice(2, 11) || "999999999", type: "MOBILE" }]
            : undefined,
        },
        qr_codes: [{ amount: { value: cents }, expiration_date: expiresAt }],
        notification_urls: [] as string[],
      };

      const res = await fetch(`${base}/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${psToken}`,
          "Content-Type": "application/json",
          "x-api-version": "4.0",
        },
        body: JSON.stringify(payload),
      });
      const psJson: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        await failBooking(supabaseAdmin, booking.id);
        const msg = psJson?.error_messages?.[0]?.description ?? psJson?.message ?? `Erro PagSeguro (${res.status})`;
        throw new Error(msg);
      }

      const qr = psJson?.qr_codes?.[0];
      const qrText: string | null = qr?.text ?? null;
      const qrPng: string | null = qr?.links?.find((l: any) => l.media === "image/png")?.href ?? null;

      await supabaseAdmin
        .from("bookings")
        .update({
          payment_provider_id: psJson?.id ?? null,
          payment_pix_code: qrText,
          payment_qr_base64: qrPng, // aqui gravamos a URL do PNG (não base64) — o front usa <img src>
        })
        .eq("id", booking.id);

      return {
        bookingId: booking.id as number,
        guestToken: booking.guest_token as string,
        method,
        provider: "pagseguro" as const,
        status: "pending",
        statusDetail: null,
        qrCode: qrText,
        qrBase64: null,
        qrImageUrl: qrPng,
        ticketUrl: null,
      };
      } catch (e) {
        await failBooking(supabaseAdmin, booking.id);
        throw e instanceof Error ? e : new Error("Falha ao processar pagamento PagSeguro.");
      }
    }

    await failBooking(supabaseAdmin, booking.id);
    throw new Error("Plataforma de pagamento não suportada.");
  });

async function failBooking(supabaseAdmin: any, id: number) {
  await supabaseAdmin.from("bookings").update({ payment_status: "failed", status: "cancelled" }).eq("id", id);
}

// Retro-compatibilidade
export const createPixPayment = createPayment;