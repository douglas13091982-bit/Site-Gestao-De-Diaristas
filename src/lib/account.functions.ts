import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Dispara o e-mail de criação/redefinição de senha via Supabase Auth.
 *
 * IMPORTANTE (segurança): esta função SEMPRE retorna `{ ok: true }` — mesmo
 * que o e-mail informado não exista — para evitar enumeração de contas.
 * Erros do provedor são registrados no log do servidor, nunca vazados ao
 * cliente.
 */
export const sendPasswordSetupEmail = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ email: z.string().email(), redirectTo: z.string().url() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();
    try {
      const { error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: data.redirectTo },
      });
      if (error) console.warn("[sendPasswordSetupEmail]", error.message);
    } catch (e) {
      console.warn("[sendPasswordSetupEmail] unexpected", e);
    }
    return { ok: true as const };
  });