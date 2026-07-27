import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  sanitizeText,
  sanitizeTextOrNull,
  sanitizeEmail,
  sanitizeDigits,
} from "@/shared/lib/sanitize";

const inputSchema = z.object({
  professional_id: z.string().uuid().nullable().optional(),
  booking_type: z.enum(["direct", "quick"]).default("direct"),
  service_type: z.string().optional().nullable(),
  // Preço e duração são derivados no servidor a partir de pricing_packages.
  package_id: z.number().int().positive(),
  booking_date: z.string(),
  start_time: z.string(),
  property_type: z.string().optional().nullable(),
  rooms: z.number().int().nullable().optional(),
  bathrooms: z.number().int().nullable().optional(),
  address: z.string().min(3).optional().nullable(),
  address_complement: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  city_slug: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // client_id NUNCA é aceito do corpo — vem exclusivamente do bearer token.
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
  // Mercado Pago Device ID (window.MP_DEVICE_SESSION_ID) — antifraude.
  device_id: z.string().optional().nullable(),
});

export const createPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // ---- Sanitização de todo texto vindo do cliente -----------------
    // Remove HTML/scripts/caracteres de controle e aplica limites de
    // tamanho antes de qualquer uso (DB, Mercado Pago, PagSeguro).
    const clean = {
      address: sanitizeTextOrNull(data.address, { maxLength: 200, collapseWhitespace: true }),
      address_complement: sanitizeTextOrNull(data.address_complement, { maxLength: 120 }),
      city: sanitizeTextOrNull(data.city, { maxLength: 80, collapseWhitespace: true }),
      city_slug: sanitizeTextOrNull(data.city_slug, { maxLength: 80 }),
      notes: sanitizeTextOrNull(data.notes, { maxLength: 500 }),
      property_type: sanitizeTextOrNull(data.property_type, { maxLength: 40 }),
      service_type: sanitizeTextOrNull(data.service_type, { maxLength: 60 }),
      client_name: sanitizeTextOrNull(data.client_name, { maxLength: 80, collapseWhitespace: true }),
      client_email: sanitizeEmail(data.client_email),
      client_phone: sanitizeDigits(data.client_phone, 15) || null,
      payer_document: sanitizeDigits(data.payer_document, 14),
    };
    const isQuick = data.booking_type === "quick";
    if (!isQuick) {
      if (!clean.address || clean.address.length < 3) {
        throw new Error("Endereço inválido.");
      }
      if (!data.professional_id) {
        throw new Error("Profissional obrigatório para agendamento direto.");
      }
    } else {
      if (!clean.city_slug) {
        throw new Error("Cidade é obrigatória para agendamento rápido.");
      }
    }

    // ---- Autorização opcional ----------------------------------------
    // Se houver bearer válido, prendemos o booking ao usuário autenticado.
    // Sem bearer, é guest checkout (client_id fica nulo). O corpo NUNCA
    // pode escolher outro dono para o agendamento.
    let authenticatedUserId: string | null = null;
    try {
      const req = getRequest();
      const authHeader = req?.headers.get("authorization") ?? "";
      if (authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice("Bearer ".length).trim();
        if (token) {
          const { data: claims } = await supabaseAdmin.auth.getClaims(token);
          authenticatedUserId = claims?.claims?.sub ?? null;
        }
      }
    } catch {
      authenticatedUserId = null;
    }

    // ---- Preço/duração derivados no servidor -------------------------
    const { data: pkg, error: pkgErr } = await supabaseAdmin
      .from("pricing_packages")
      .select("id, duration_hours, price, is_enabled")
      .eq("id", data.package_id)
      .maybeSingle();
    if (pkgErr || !pkg) throw new Error("Pacote de preço não encontrado.");
    if (pkg.is_enabled === false) throw new Error("Pacote de preço indisponível.");
    // Data/hora não pode estar no passado (fuso America/Sao_Paulo).
    try {
      const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false,
      });
      const p = Object.fromEntries(fmt.formatToParts(new Date()).map(x => [x.type, x.value]));
      const todayISO = `${p.year}-${p.month}-${p.day}`;
      const nowMin = Number(p.hour) * 60 + Number(p.minute);
      if (data.booking_date < todayISO) {
        throw new Error("Data do agendamento no passado.");
      }
      if (data.booking_date === todayISO) {
        const [h, m] = data.start_time.split(":").map(Number);
        if (!Number.isFinite(h) || !Number.isFinite(m)) throw new Error("Horário inválido.");
        if (h * 60 + m < nowMin + 30) {
          throw new Error("Horário no passado. Escolha um horário com pelo menos 30 minutos de antecedência.");
        }
      }
    } catch (e) {
      if (e instanceof Error && /passado|Horário/.test(e.message)) throw e;
    }
    const trustedPrice = Number(pkg.price);
    const trustedDuration = Number(pkg.duration_hours);
    if (!Number.isFinite(trustedPrice) || trustedPrice <= 0) {
      throw new Error("Pacote de preço inválido.");
    }

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
        client_id: authenticatedUserId,
        client_email: clean.client_email,
        client_name: clean.client_name,
        client_phone: clean.client_phone,
        professional_id: isQuick ? null : data.professional_id!,
        booking_type: isQuick ? "quick" : "direct",
        service_type: clean.service_type ?? "diarista",
        property_type: clean.property_type,
        booking_date: data.booking_date,
        start_time: data.start_time,
        duration_hours: trustedDuration,
        rooms: data.rooms ?? null,
        bathrooms: data.bathrooms ?? null,
        address: clean.address ?? null,
        address_complement: clean.address_complement,
        city: clean.city,
        city_slug: clean.city_slug,
        notes: clean.notes,
        status: "awaiting_payment",
        total_price: trustedPrice,
        payment_method: method,
        payment_status: "pending",
        payment_amount: trustedPrice,
      })
      .select("id, guest_token")
      .single();
    if (bkErr || !booking) throw new Error(bkErr?.message ?? "Falha ao criar agendamento");

    const [firstName, ...rest] = (clean.client_name ?? "Cliente").split(" ");
    const cpfDigits = clean.payer_document;

    // -------------------- MERCADO PAGO --------------------
    if (platform === "mercadopago") {
      const accessToken = s.mp_access_token?.trim();
      if (!accessToken) {
        await failBooking(supabaseAdmin, booking.id);
        throw new Error("Mercado Pago não configurado. Peça ao administrador para preencher o Access Token.");
      }
      try {
      const idempotencyKey = `bk-${booking.id}-${Date.now()}`;
      const itemTitle = isQuick ? "Agendamento rápido Gersepa" : "Agendamento Gersepa";
      const itemDescription = [
        clean.service_type ?? "Serviço de limpeza",
        `${trustedDuration}h`,
        clean.city ? `em ${clean.city}` : null,
        `agendamento #${booking.id}`,
      ].filter(Boolean).join(" — ");
      const mpBody: Record<string, unknown> = {
        transaction_amount: Number(trustedPrice.toFixed(2)),
        description: `Agendamento Gersepa #${booking.id}`,
        external_reference: `booking:${booking.id}`,
        notification_url: "https://gersepas.lovable.app/api/public/webhooks/mercadopago",
        statement_descriptor: "GERSEPA",
        payer: {
          email: clean.client_email,
          first_name: firstName || "Cliente",
          last_name: rest.join(" ") || "Gersepa",
          ...(cpfDigits.length === 11 ? { identification: { type: "CPF", number: cpfDigits } } : {}),
        },
        additional_info: {
          items: [
            {
              id: String(booking.id),
              title: itemTitle,
              description: itemDescription,
              category_id: "services",
              quantity: 1,
              unit_price: Number(trustedPrice.toFixed(2)),
            },
          ],
          payer: {
            first_name: firstName || "Cliente",
            last_name: rest.join(" ") || "Gersepa",
            ...(clean.client_phone && clean.client_phone.length >= 10
              ? { phone: { area_code: clean.client_phone.slice(0, 2), number: clean.client_phone.slice(2) } }
              : {}),
            ...(clean.address
              ? { address: { street_name: clean.address, zip_code: "" } }
              : {}),
          },
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
          ...(data.device_id ? { "X-meli-session-id": data.device_id } : {}),
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

      if (approved) {
        try {
          if (isQuick) {
            const { broadcastNewBookingPush } = await import("./push.functions");
            await broadcastNewBookingPush({ data: { bookingId: booking.id as number } });
          } else {
            const { notifyProfessionalBookingConfirmed } = await import("./push.functions");
            await notifyProfessionalBookingConfirmed({ data: { bookingId: booking.id as number } });
          }
        } catch (e) {
          console.warn("[push] falha ao notificar profissionais (card)", e);
        }
        try {
          const { notifyAdminsBookingPaid } = await import("./push.functions");
          await notifyAdminsBookingPaid({ data: { bookingId: booking.id as number } });
        } catch (e) {
          console.warn("[push] falha ao notificar admins (card)", e);
        }
      }

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

      const cents = Math.round(trustedPrice * 100);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      const payload = {
        reference_id: `booking-${booking.id}`,
        customer: {
          name: (clean.client_name ?? "Cliente").slice(0, 30),
          email: clean.client_email,
          tax_id: cpfDigits || "00000000000",
          phones: clean.client_phone
            ? [{ country: "55", area: (clean.client_phone.slice(0, 2) || "11"), number: clean.client_phone.slice(2, 11) || "999999999", type: "MOBILE" }]
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