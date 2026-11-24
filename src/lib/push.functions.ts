import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sendSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(500),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(300),
  link: z.string().max(300).optional(),
  imageUrl: z.string().url().max(2000).optional(),
  systemNotification: z.boolean().optional(),
});

export const sendPushToUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => sendSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (data.userIds.some((id) => id !== context.userId)) {
      const { data: isAdmin } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("Envio para outras contas exige permissão de administrador.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendFcmMessage } = await import("./fcm.server");

    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("user_id, endpoint")
      .eq("p256dh", "fcm")
      .eq("auth", "fcm")
      .in("user_id", data.userIds);
    if (error) return { sent: 0, failed: 0, error: error.message };
    if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

    let sent = 0;
    let failed = 0;
    const stale: string[] = [];
    const notificationData = data.systemNotification
      ? { systemNotification: "true", tag: crypto.randomUUID() }
      : undefined;
    await Promise.all(
      subs.map(async (s) => {
        const r = await sendFcmMessage({
          token: s.endpoint,
          title: data.title,
          body: data.body,
          link: data.link,
          imageUrl: data.imageUrl,
          data: notificationData,
        });
        if (r.ok) sent++;
        else {
          failed++;
          if (r.unregistered) {
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

export const listAdminPushRecipients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas administradores podem consultar os destinatários.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [roles, profiles, subscriptions] = await Promise.all([
      readAllRoles(),
      readAllProfiles(),
      readAllSubscriptions(),
    ]);
    const adminIds = new Set(roles.filter(({ role }) => role === "admin").map(({ user_id }) => user_id));
    const professionalIds = new Set(roles.filter(({ role }) => role === "professional").map(({ user_id }) => user_id));
    const accounts = new Map(profiles.map((profile) => [profile.id, profile]));
    for (const { user_id: id } of roles) {
      if (!accounts.has(id)) accounts.set(id, { id, full_name: null, email: null, is_professional: false });
    }
    const counts = new Map<string, number>();
    for (const { user_id } of subscriptions) counts.set(user_id, (counts.get(user_id) ?? 0) + 1);
    return [...accounts.values()].filter(({ id }) => !adminIds.has(id)).map((profile) => ({
      ...profile,
      is_professional: profile.is_professional || professionalIds.has(profile.id),
      devices: counts.get(profile.id) ?? 0,
    })).sort((a, b) => (a.full_name ?? a.email ?? "").localeCompare(b.full_name ?? b.email ?? "", "pt-BR"));

    async function readAllRoles() {
      const rows: { user_id: string; role: string }[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabaseAdmin.from("user_roles")
          .select("user_id, role").order("user_id").order("role").range(offset, offset + 499);
        if (error) throw new Error("Não foi possível carregar os grupos de usuários.");
        rows.push(...data);
        if (data.length < 500) return rows;
      }
    }

    async function readAllProfiles() {
      const rows: { id: string; full_name: string | null; email: string | null; is_professional: boolean }[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabaseAdmin.from("profiles")
          .select("id, full_name, email, is_professional").order("id").range(offset, offset + 499);
        if (error) throw new Error("Não foi possível carregar os destinatários.");
        rows.push(...data);
        if (data.length < 500) return rows;
      }
    }

    async function readAllSubscriptions() {
      const rows: { user_id: string }[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabaseAdmin.from("push_subscriptions")
          .select("user_id").eq("p256dh", "fcm").eq("auth", "fcm").order("endpoint").range(offset, offset + 499);
        if (error) throw new Error("Não foi possível carregar os dispositivos.");
        rows.push(...data);
        if (data.length < 500) return rows;
      }
    }
  });

/**
 * Notifica TODOS os administradores quando uma nova solicitação de saque é criada.
 * O trigger no banco já insere a linha em `notifications`; aqui enviamos o push (FCM).
 */
export const notifyAdminsWithdrawalRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ withdrawalId: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendFcmMessage } = await import("./fcm.server");

    const { data: w } = await supabaseAdmin
      .from("withdrawal_requests")
      .select("id, amount, professional_id")
      .eq("id", data.withdrawalId)
      .eq("professional_id", context.userId)
      .maybeSingle();
    if (!w) return { sent: 0, failed: 0, error: "withdrawal not found" };

    const { data: pro } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", w.professional_id)
      .maybeSingle();

    const { data: admins } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminIds = Array.from(new Set((admins ?? []).map((a) => a.user_id).filter(Boolean))) as string[];
    if (adminIds.length === 0) return { sent: 0, failed: 0 };

    const amount = Number(w.amount ?? 0);
    const valorStr = amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const title = "Nova solicitação de saque";
    const body = `${pro?.full_name ?? "Diarista"} solicitou ${valorStr}`;
    const link = "/admin/finance";

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
          if (r.unregistered) {
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

export const cancelPaidProfessionalBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ bookingId: z.number().int().positive() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("cancel_professional_booking", {
      booking_id: data.bookingId,
    });
    if (error) throw new Error(error.message);

    try {
      const { broadcastNewBookingPush } = await import("./booking-push.server");
      const result = await broadcastNewBookingPush(data.bookingId);
      if (result.failed || ("error" in result && result.error)) {
        console.warn("[push] falha parcial na redistribuição", data.bookingId);
      }
    } catch (error) {
      // A oferta e o aviso no app já foram gravados na transação.
      console.warn("[push] falha na redistribuição", data.bookingId, error);
    }
    return { requeued: true };
  });
