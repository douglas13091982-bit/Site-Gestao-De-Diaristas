import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const headers: Record<string, string> = {};
        request.headers.forEach((v, k) => { headers[k] = v; });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Read webhook secret from app_settings
        const { data: secretRow } = await supabaseAdmin
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "mp_webhook_secret")
          .maybeSingle();
        const secret = secretRow?.setting_value ?? "";

        // Mercado Pago sends x-signature: "ts=...,v1=<hmac>" and x-request-id
        // Manifest: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
        let signatureValid = false;
        let payload: unknown = null;
        try { payload = rawBody ? JSON.parse(rawBody) : null; } catch { /* keep raw */ }

        if (secret) {
          try {
            const sigHeader = request.headers.get("x-signature") ?? "";
            const requestId = request.headers.get("x-request-id") ?? "";
            const parts = Object.fromEntries(
              sigHeader.split(",").map((p) => {
                const [k, ...rest] = p.trim().split("=");
                return [k, rest.join("=")];
              })
            );
            const ts = parts.ts ?? "";
            const v1 = parts.v1 ?? "";
            const url = new URL(request.url);
            const dataId = url.searchParams.get("data.id") ??
              (payload as { data?: { id?: string | number } } | null)?.data?.id?.toString() ?? "";
            const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
            const expected = createHmac("sha256", secret).update(manifest).digest("hex");
            const a = Buffer.from(v1, "hex");
            const b = Buffer.from(expected, "hex");
            signatureValid = a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
          } catch { signatureValid = false; }
        }

        const eventType = (payload as { type?: string; action?: string } | null)?.type
          ?? (payload as { action?: string } | null)?.action ?? null;
        const externalId = (payload as { data?: { id?: string | number } } | null)?.data?.id?.toString() ?? null;
        const httpStatus = !secret ? 200 : signatureValid ? 200 : 401;

        await supabaseAdmin.from("webhook_events").insert({
          provider: "mercadopago",
          event_type: eventType,
          external_id: externalId,
          signature_valid: signatureValid,
          status: !secret ? "no_secret_configured" : signatureValid ? "verified" : "invalid_signature",
          http_status: httpStatus,
          payload: (payload ?? null) as never,
          headers: headers as never,
          error: !secret ? "Webhook secret not configured" : signatureValid ? null : "Invalid signature",
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