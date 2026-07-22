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
});

export const createPixPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: settingsRows, error: settingsErr } = await supabaseAdmin
      .from("app_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["mp_access_token", "mp_environment", "payment_platform"]);
    if (settingsErr) throw new Error("Falha ao ler configurações de pagamento");

    const s = Object.fromEntries((settingsRows ?? []).map((r) => [r.setting_key, r.setting_value ?? ""]));
    const accessToken = s.mp_access_token?.trim();
    if (!accessToken) {
      throw new Error("Mercado Pago não configurado. O administrador precisa preencher o Access Token em Configurações.");
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
        payment_method: "pix",
        payment_status: "pending",
        payment_amount: data.total_price,
      })
      .select("id, guest_token")
      .single();
    if (bkErr || !booking) throw new Error(bkErr?.message ?? "Falha ao criar agendamento");

    // Call Mercado Pago /v1/payments to create a PIX charge
    const [firstName, ...rest] = (data.client_name ?? "Cliente").trim().split(" ");
    const idempotencyKey = `bk-${booking.id}-${Date.now()}`;
    const mpBody = {
      transaction_amount: Number(Number(data.total_price).toFixed(2)),
      description: `Agendamento Gersepa #${booking.id}`,
      payment_method_id: "pix",
      external_reference: `booking:${booking.id}`,
      payer: {
        email: data.client_email,
        first_name: firstName || "Cliente",
        last_name: rest.join(" ") || "Gersepa",
      },
    };

    let mpJson: {
      id?: number | string;
      status?: string;
      point_of_interaction?: {
        transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string };
      };
      message?: string;
      error?: string;
    } = {};
    try {
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
        await supabaseAdmin
          .from("bookings")
          .update({ payment_status: "failed", status: "cancelled" })
          .eq("id", booking.id);
        throw new Error(mpJson?.message ?? mpJson?.error ?? `Erro Mercado Pago (${res.status})`);
      }
    } catch (e) {
      throw e instanceof Error ? e : new Error("Erro ao criar cobrança PIX");
    }

    const td = mpJson.point_of_interaction?.transaction_data ?? {};
    await supabaseAdmin
      .from("bookings")
      .update({
        payment_provider_id: mpJson.id ? String(mpJson.id) : null,
        payment_pix_code: td.qr_code ?? null,
        payment_qr_base64: td.qr_code_base64 ?? null,
      })
      .eq("id", booking.id);

    return {
      bookingId: booking.id as number,
      guestToken: booking.guest_token as string,
      qrCode: td.qr_code ?? null,
      qrBase64: td.qr_code_base64 ?? null,
      ticketUrl: td.ticket_url ?? null,
    };
  });