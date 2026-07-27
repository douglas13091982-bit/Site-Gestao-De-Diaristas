import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Registra um pedido de redefinição de senha para o admin tratar por WhatsApp.
 *
 * IMPORTANTE (segurança): esta função SEMPRE retorna `{ ok: true }` — mesmo
 * que o e-mail informado não exista — para evitar enumeração de contas.
 * Quando o e-mail existe, cria um registro em `password_reset_requests` e
 * notifica todos os admins (in-app + push). Nenhum e-mail é enviado à
 * pessoa — quem entrega o link é o admin, via WhatsApp.
 */
export const sendPasswordSetupEmail = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ email: z.string().email(), redirectTo: z.string().url() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();
    try {
      // 1) Localiza o perfil pelo e-mail. Se não existir, sai silenciosamente.
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, phone, is_professional")
        .eq("email", email)
        .maybeSingle();
      if (!profile) return { ok: true as const };

      // 2) Já existe pedido pendente? evita spam.
      const { data: existing } = await supabaseAdmin
        .from("password_reset_requests")
        .select("id")
        .eq("email", email)
        .eq("status", "pending")
        .maybeSingle();
      if (existing) return { ok: true as const };

      // 3) Cria pedido.
      const { data: inserted } = await supabaseAdmin
        .from("password_reset_requests")
        .insert({
          email,
          user_id: profile.id,
          full_name: profile.full_name ?? null,
          phone: profile.phone ?? null,
          is_professional: !!profile.is_professional,
          status: "pending",
        })
        .select("id")
        .maybeSingle();

      // 4) Notifica admins (in-app + push).
      const { data: admins } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const adminIds = Array.from(
        new Set((admins ?? []).map((a) => a.user_id).filter(Boolean)),
      ) as string[];

      if (adminIds.length > 0) {
        const nome = profile.full_name || email;
        const tipo = profile.is_professional ? "Diarista" : "Cliente";
        const title = "Pedido de redefinição de senha";
        const body = `${tipo}: ${nome} — envie o link por WhatsApp`;
        const link = "/admin/password-resets";
        await supabaseAdmin.from("notifications").insert(
          adminIds.map((uid) => ({ user_id: uid, title, body, link })),
        );

        const { data: subs } = await supabaseAdmin
          .from("push_subscriptions")
          .select("endpoint")
          .in("user_id", adminIds);
        if (subs && subs.length > 0) {
          const { sendFcmMessage } = await import("./fcm.server");
          const stale: string[] = [];
          await Promise.all(
            subs.map(async (s) => {
              const r = await sendFcmMessage({ token: s.endpoint, title, body, link });
              if (!r.ok && r.error && /UNREGISTERED|INVALID_ARGUMENT|NOT_FOUND|404/i.test(r.error)) {
                stale.push(s.endpoint);
              }
            }),
          );
          if (stale.length) {
            await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
          }
        }
      }

      void inserted;
      void data.redirectTo;
    } catch (e) {
      console.warn("[sendPasswordSetupEmail] unexpected", e);
    }
    return { ok: true as const };
  });

/**
 * (Admin) Gera um link de recovery do Supabase para um pedido pendente e o
 * marca como enviado. Retorna também o telefone/nome para o admin construir
 * a mensagem de WhatsApp.
 */
export const generateResetLinkForRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ requestId: z.number().int().positive(), redirectTo: z.string().url() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Verifica papel admin usando o cliente autenticado (RLS aplica).
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req, error: reqErr } = await supabaseAdmin
      .from("password_reset_requests")
      .select("id, email, phone, full_name, status")
      .eq("id", data.requestId)
      .maybeSingle();
    if (reqErr) throw new Error(reqErr.message);
    if (!req) throw new Error("Pedido não encontrado");

    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: req.email,
      options: { redirectTo: data.redirectTo },
    });
    if (linkErr) throw new Error(linkErr.message);
    const actionLink = link?.properties?.action_link ?? null;
    if (!actionLink) throw new Error("Não foi possível gerar o link");

    await supabaseAdmin
      .from("password_reset_requests")
      .update({ status: "sent", handled_by: context.userId, handled_at: new Date().toISOString() })
      .eq("id", data.requestId);

    return {
      link: actionLink as string,
      phone: req.phone ?? null,
      fullName: req.full_name ?? null,
      email: req.email,
    };
  });

/**
 * (Admin) Marca um pedido como ignorado — para casos em que o admin decide
 * não enviar o link (ex.: pedido suspeito).
 */
export const ignoreResetRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ requestId: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("password_reset_requests")
      .update({ status: "ignored", handled_by: context.userId, handled_at: new Date().toISOString() })
      .eq("id", data.requestId);
    return { ok: true as const };
  });