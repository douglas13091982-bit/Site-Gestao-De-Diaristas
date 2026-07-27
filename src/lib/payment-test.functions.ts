import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Testa credenciais do provedor de pagamento fazendo uma chamada
 * autenticada ao endpoint de identidade do provedor.
 * Requer usuário admin.
 */
export const testPaymentProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ provider: z.enum(["mercadopago", "pagseguro"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verifica se é admin
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) {
      return { ok: false, error: "Acesso negado. Apenas administradores." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.provider === "mercadopago") {
      const { data: rows } = await supabaseAdmin
        .from("app_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["mp_access_token", "mp_environment"]);
      const cfg = Object.fromEntries((rows ?? []).map((r) => [r.setting_key, r.setting_value ?? ""]));
      const token = cfg.mp_access_token ?? "";
      if (!token) return { ok: false, error: "Access Token não configurado." };

      try {
        const res = await fetch("https://api.mercadopago.com/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          return {
            ok: false,
            error: `HTTP ${res.status} — ${body.slice(0, 200) || res.statusText}`,
          };
        }
        const info = (await res.json()) as {
          id?: number;
          nickname?: string;
          email?: string;
          site_id?: string;
        };
        return {
          ok: true,
          provider: "mercadopago" as const,
          environment: cfg.mp_environment || "sandbox",
          account: {
            id: info.id,
            nickname: info.nickname,
            email: info.email,
            site_id: info.site_id,
          },
        };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Falha na conexão" };
      }
    }

    // PagSeguro
    const { data: rows } = await supabaseAdmin
      .from("app_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["ps_token", "ps_email", "ps_environment"]);
    const cfg = Object.fromEntries((rows ?? []).map((r) => [r.setting_key, r.setting_value ?? ""]));
    const token = cfg.ps_token ?? "";
    const email = cfg.ps_email ?? "";
    const env = cfg.ps_environment || "sandbox";
    if (!token || !email) {
      return { ok: false, error: "Token e Email precisam estar configurados." };
    }

    const base =
      env === "production"
        ? "https://ws.pagseguro.uol.com.br"
        : "https://ws.sandbox.pagseguro.uol.com.br";

    try {
      const url = `${base}/v2/sessions?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
      const res = await fetch(url, { method: "POST" });
      const body = await res.text().catch(() => "");
      if (!res.ok) {
        return {
          ok: false,
          error: `HTTP ${res.status} — ${body.slice(0, 200) || res.statusText}`,
        };
      }
      return {
        ok: true,
        provider: "pagseguro" as const,
        environment: env,
        account: { email },
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Falha na conexão" };
    }
  });