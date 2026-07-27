import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const sendSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(500),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(300),
  link: z.string().max(300).optional(),
  imageUrl: z.string().url().max(500).optional(),
});

/**
 * Envia push (FCM v1) para todos os tokens dos user_ids informados.
 * Endpoint público — o conteúdo é derivado de dados públicos do agendamento;
 * não expõe PII sensível.
 */
export const sendPushToUsers = createServerFn({ method: "POST" })
  .inputValidator((d) => sendSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendFcmMessage } = await import("./fcm.server");

    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("user_id, endpoint")
      .in("user_id", data.userIds);
    if (error) return { sent: 0, failed: 0, error: error.message };
    if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

    let sent = 0;
    let failed = 0;
    const stale: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        const r = await sendFcmMessage({
          token: s.endpoint,
          title: data.title,
          body: data.body,
          link: data.link,
          imageUrl: data.imageUrl,
        });
        if (r.ok) sent++;
        else {
          failed++;
          if (r.error && /UNREGISTERED|INVALID_ARGUMENT|NOT_FOUND|404/i.test(r.error)) {
            stale.push(s.endpoint);
          }
        }
      }),
    );
    if (stale.length) {
      await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
    }
    return { sent, failed };
  });

/**
 * Notifica TODOS os administradores quando um agendamento é pago/concretizado.
 * - Cria linha em `notifications` (in-app) para cada admin
 * - Envia push (FCM) para todos os tokens dos admins
 */
export const notifyAdminsBookingPaid = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ bookingId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendFcmMessage } = await import("./fcm.server");

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, service_type, city, booking_date, start_time, total_price, booking_type, professional_id, client_name")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking) return { sent: 0, failed: 0, error: "booking not found" };

    const { data: admins } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminIds = Array.from(new Set((admins ?? []).map((a) => a.user_id).filter(Boolean))) as string[];
    if (adminIds.length === 0) return { sent: 0, failed: 0 };

    const dateStr = booking.booking_date
      ? new Date(booking.booking_date as string).toLocaleDateString("pt-BR")
      : "";
    const timeStr = typeof booking.start_time === "string" ? (booking.start_time as string).slice(0, 5) : "";
    const total = Number(booking.total_price ?? 0);
    const totalStr = total > 0 ? total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
    const tipo = booking.booking_type === "quick" ? "Agendamento rápido" : "Novo agendamento";
    const title = `${tipo} pago!`;
    const parts = [
      booking.service_type ?? "Serviço",
      booking.city ? `em ${booking.city}` : "",
      dateStr && timeStr ? `${dateStr} às ${timeStr}` : dateStr || (timeStr ? `às ${timeStr}` : ""),
      totalStr ? `Total ${totalStr}` : "",
    ].filter(Boolean);
    const body = parts.join(" • ");
    const link = "/admin/bookings";

    // In-app para cada admin
    await supabaseAdmin.from("notifications").insert(
      adminIds.map((uid) => ({ user_id: uid, title, body, link })),
    );

    // Push
    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint")
      .in("user_id", adminIds);
    if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

    let sent = 0;
    let failed = 0;
    const stale: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        const r = await sendFcmMessage({ token: s.endpoint, title, body, link });
        if (r.ok) sent++;
        else {
          failed++;
          if (r.error && /UNREGISTERED|INVALID_ARGUMENT|NOT_FOUND|404/i.test(r.error)) {
            stale.push(s.endpoint);
          }
        }
      }),
    );
    if (stale.length) {
      await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
    }
    return { sent, failed };
  });

/**
 * Após criar um agendamento, dispara push para as diaristas elegíveis
 * (que já têm oferta pendente na tabela booking_offers).
 */
export const broadcastNewBookingPush = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ bookingId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendFcmMessage } = await import("./fcm.server");

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, service_type, city, booking_date, start_time, total_price")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking) return { sent: 0, failed: 0, error: "booking not found" };

    const { data: offers } = await supabaseAdmin
      .from("booking_offers")
      .select("professional_id")
      .eq("booking_id", data.bookingId)
      .eq("status", "pending");
    const ids = (offers ?? []).map((o) => o.professional_id);
    if (ids.length === 0) return { sent: 0, failed: 0 };

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint")
      .in("user_id", ids);
    if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

    const dateStr = booking.booking_date ? new Date(booking.booking_date as string).toLocaleDateString("pt-BR") : "";
    const timeStr = typeof booking.start_time === "string" ? (booking.start_time as string).slice(0, 5) : "";
    const { data: setting } = await supabaseAdmin
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "commission_percentage")
      .maybeSingle();
    const pct = Number(setting?.setting_value ?? 20) || 20;
    const total = Number(booking.total_price ?? 0);
    const payout = total * (1 - pct / 100);
    const payoutStr = payout > 0 ? payout.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
    const title = "Novo pedido disponível!";
    const parts = [
      booking.service_type ?? "Serviço",
      booking.city ? `em ${booking.city}` : "",
      dateStr && timeStr ? `${dateStr} às ${timeStr}` : dateStr || (timeStr ? `às ${timeStr}` : ""),
      payoutStr ? `Você recebe ${payoutStr}` : "",
    ].filter(Boolean);
    const body = parts.join(" • ");

    let sent = 0;
    let failed = 0;
    const stale: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        const r = await sendFcmMessage({
          token: s.endpoint,
          title,
          body,
          link: "/pro/leads",
        });
        if (r.ok) sent++;
        else {
          failed++;
          if (r.error && /UNREGISTERED|INVALID_ARGUMENT|NOT_FOUND|404/i.test(r.error)) {
            stale.push(s.endpoint);
          }
        }
      }),
    );
    if (stale.length) {
      await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
    }
    return { sent, failed };
  });

/**
 * Notifica UMA diarista que um agendamento direto foi confirmado para ela.
 * - Cria uma linha em `notifications` (in-app)
 * - Envia push (FCM) para todos os tokens da diarista
 */
export const notifyProfessionalBookingConfirmed = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ bookingId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendFcmMessage } = await import("./fcm.server");

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, professional_id, service_type, city, booking_date, start_time, total_price")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking || !booking.professional_id) return { sent: 0, failed: 0, error: "sem profissional" };

    const dateStr = booking.booking_date
      ? new Date(booking.booking_date as string).toLocaleDateString("pt-BR")
      : "";
    const timeStr = typeof booking.start_time === "string" ? (booking.start_time as string).slice(0, 5) : "";
    const { data: setting } = await supabaseAdmin
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "commission_percentage")
      .maybeSingle();
    const pct = Number(setting?.setting_value ?? 20) || 20;
    const total = Number(booking.total_price ?? 0);
    const payout = total * (1 - pct / 100);
    const payoutStr = payout > 0 ? payout.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
    const title = "Novo agendamento confirmado!";
    const parts = [
      booking.service_type ?? "Serviço",
      booking.city ? `em ${booking.city}` : "",
      dateStr && timeStr ? `${dateStr} às ${timeStr}` : dateStr || (timeStr ? `às ${timeStr}` : ""),
      payoutStr ? `Você recebe ${payoutStr}` : "",
    ].filter(Boolean);
    const body = parts.join(" • ");
    const link = "/pro/agenda";

    // In-app
    await supabaseAdmin.from("notifications").insert({
      user_id: booking.professional_id,
      title,
      body,
      link,
    });

    // Push
    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint")
      .eq("user_id", booking.professional_id);
    if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

    let sent = 0;
    let failed = 0;
    const stale: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        const r = await sendFcmMessage({ token: s.endpoint, title, body, link });
        if (r.ok) sent++;
        else {
          failed++;
          if (r.error && /UNREGISTERED|INVALID_ARGUMENT|NOT_FOUND|404/i.test(r.error)) {
            stale.push(s.endpoint);
          }
        }
      }),
    );
    if (stale.length) {
      await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
    }
    return { sent, failed };
  });