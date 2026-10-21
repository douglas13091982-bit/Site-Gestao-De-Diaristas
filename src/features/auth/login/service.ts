import { supabase } from "@/integrations/supabase/client";
import { sendPasswordSetupEmail } from "@/lib/account.functions";

export type LoginRole = "client" | "professional";

/**
 * Login com senha. Nunca revela se o e-mail existe: em caso de credenciais
 * inválidas, apenas propaga o erro para exibição genérica na UI.
 */
export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { ok: true as const };
}

/**
 * Cria uma nova conta. Nunca sonda a existência do e-mail antes; deixa o
 * Supabase decidir. Em qualquer erro do provedor, propaga para a UI.
 */
export async function signUpAccount(args: {
  email: string;
  password: string;
  fullName: string;
  role: LoginRole;
  city?: string;
  state?: string;
}) {
  const { error } = await supabase.auth.signUp({
    email: args.email,
    password: args.password,
    options: {
      emailRedirectTo: `${window.location.origin}/${args.role === "professional" ? "pro" : "dashboard"}`,
      data: { full_name: args.fullName, role: args.role, ...(args.role === "professional" ? { city: args.city, state: args.state } : {}) },
    },
  });
  if (error) throw error;
  return { ok: true as const };
}

/**
 * Dispara o e-mail de criação/redefinição de senha. A resposta é sempre
 * `{ ok: true }` — o servidor não revela se o e-mail existe, evitando
 * enumeração de contas.
 */
export async function requestPasswordSetupEmail(
  email: string,
  sendSetup: (input: { data: { email: string; redirectTo: string } }) => Promise<unknown>,
) {
  await sendSetup({
    data: { email, redirectTo: `${window.location.origin}/reset-password` },
  });
  return { ok: true as const };
}

// Re-export server-fn ref para importar via feature entry.
export { sendPasswordSetupEmail };