import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sendSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(500),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(300),
  link: z.string().max(300).optional(),
  imageUrl: z.string().url().max(500).optional(),
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
