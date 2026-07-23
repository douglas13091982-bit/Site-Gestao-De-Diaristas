import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const checkEmailRegistered = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ email: z.string().email() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .ilike("email", email)
      .maybeSingle();
    return { exists: !!profile };
  });

export const sendPasswordSetupEmail = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ email: z.string().email(), redirectTo: z.string().url() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: data.redirectTo },
    });
    if (error) throw new Error(error.message);
    // Supabase envia o e-mail automaticamente ao gerar o link de recovery.
    return { ok: true, email: link?.user?.email ?? email };
  });