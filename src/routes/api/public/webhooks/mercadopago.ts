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

        // Read webhook secret + access token from app_settings
        const { data: settingsRows } = await supabaseAdmin
          .from("app_settings")
          .select("setting_key, setting_value")
          .in("setting_key", ["mp_webhook_secret", "mp_access_token"]);
        const cfg = Object.fromEntries((settingsRows ?? []).map((r) => [r.setting_key, r.setting_value ?? ""]));
        const secret = cfg.mp_webhook_secret ?? "";
        const accessToken = cfg.mp_access_token ?? "";

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

        // Handle payment events: fetch payment from MP and mark booking as paid
        try {
          const isPayment = (eventType ?? "").toString().includes("payment");
          if (isPayment && externalId && accessToken) {
            const res = await fetch(`https://api.mercadopago.com/v1/payments/${externalId}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
              const pay = (await res.json()) as {
                status?: string;
                external_reference?: string;
                date_approved?: string;
              };
              const ref = pay.external_reference ?? "";
              const match = /^booking:(\d+)$/.exec(ref);
              if (match && pay.status === "approved") {
                const bookingId = Number(match[1]);
                const { data: upd } = await supabaseAdmin
                  .from("bookings")
                  .update({
                    payment_status: "paid",
                    paid_at: pay.date_approved ?? new Date().toISOString(),
                    status: "pending",
                  })
                  .eq("id", bookingId)
                  .neq("payment_status", "paid")
                  .select("id, professional_id")
                  .maybeSingle();
                if (upd?.professional_id) {
                  try {
                    const { notifyProfessionalBookingConfirmed } = await import("@/lib/push.functions");
                    await notifyProfessionalBookingConfirmed({ data: { bookingId } });
                  } catch (e) {
                    console.warn("[push] falha ao notificar profissional (pix)", e);
                  }
                }
              }
            }
          }
        } catch (e) {
          await supabaseAdmin.from("webhook_events").insert({
            provider: "mercadopago",
            event_type: "processing_error",
            external_id: externalId,
            signature_valid: signatureValid,
            status: "processing_error",
            http_status: 200,
            payload: (payload ?? null) as never,
            headers: headers as never,
            error: e instanceof Error ? e.message : "unknown",
          });
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});