import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/webhooks/pagseguro")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const headers: Record<string, string> = {};
        request.headers.forEach((v, k) => { headers[k] = v; });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: secretRow } = await supabaseAdmin
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "ps_token")
          .maybeSingle();
        const secret = secretRow?.setting_value ?? "";

        // PagSeguro sends a HMAC-SHA256 of the raw body using the account token,
        // typically in the `x-authenticity-token` header.
        let signatureValid = false;
        if (secret) {
          const provided = (request.headers.get("x-authenticity-token") ??
            request.headers.get("x-signature") ?? "").trim();
          if (provided) {
            try {
              const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
              const a = Buffer.from(provided, "hex");
              const b = Buffer.from(expected, "hex");
              signatureValid = a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
            } catch { signatureValid = false; }
          }
        }

        let payload: unknown = null;
        try { payload = rawBody ? JSON.parse(rawBody) : null; } catch { /* keep raw */ }

        const eventType = (payload as { event?: string; notificationType?: string } | null)?.event
          ?? (payload as { notificationType?: string } | null)?.notificationType ?? null;
        const externalId = (payload as { id?: string | number; code?: string } | null)?.id?.toString()
          ?? (payload as { code?: string } | null)?.code ?? null;

        const httpStatus = !secret ? 200 : signatureValid ? 200 : 401;

        await supabaseAdmin.from("webhook_events").insert({
          provider: "pagseguro",
          event_type: eventType,
          external_id: externalId,
          signature_valid: signatureValid,
          status: !secret ? "no_secret_configured" : signatureValid ? "verified" : "invalid_signature",
          http_status: httpStatus,
          payload: (payload ?? null) as never,
          headers: headers as never,
          error: !secret ? "Token not configured" : signatureValid ? null : "Invalid signature",
        });

        if (httpStatus !== 200) return new Response("Invalid signature", { status: 401 });
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});