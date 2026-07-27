import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  id: z.coerce.number().int().positive(),
  token: z.string().min(8).max(200),
});

export type GuestBookingPayload = {
  booking: {
    id: number;
    booking_date: string | null;
    start_time: string | null;
    duration_hours: number | null;
    address: string | null;
    city: string | null;
    total_price: number | null;
    payment_amount: number | null;
    payment_status: string | null;
    payment_pix_code: string | null;
    payment_qr_base64: string | null;
    client_name: string | null;
    client_email: string | null;
    professional_id: string | null;
  };
  professional: {
    full_name: string | null;
    profile_photo: string | null;
    phone: string | null;
    pix_key: string | null;
  } | null;
};

/**
 * Guest checkout lookup. Anon RLS no longer exposes guest bookings; this
 * server function validates the guest_token server-side before returning
 * the booking and the minimal set of professional contact fields the
 * customer needs to complete the PIX payment.
 */
export const getGuestBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<GuestBookingPayload> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, booking_date, start_time, duration_hours, address, city, total_price, payment_amount, payment_status, payment_pix_code, payment_qr_base64, client_name, client_email, professional_id, guest_token, client_id",
      )
      .eq("id", data.id)
      .maybeSingle();

    if (error) throw new Error("Agendamento não encontrado.");
    if (!booking) throw new Error("Agendamento não encontrado.");
    if (!booking.guest_token || booking.guest_token !== data.token) {
      throw new Error("Token inválido.");
    }

    let professional: GuestBookingPayload["professional"] = null;
    if (booking.professional_id) {
      const { data: pro } = await supabaseAdmin
        .from("profiles")
        .select("full_name, profile_photo, phone, pix_key")
        .eq("id", booking.professional_id)
        .maybeSingle();
      professional = pro ?? null;
    }

    const {
      guest_token: _gt,
      client_id: _cid,
      ...safeBooking
    } = booking;

    return { booking: safeBooking, professional };
  });