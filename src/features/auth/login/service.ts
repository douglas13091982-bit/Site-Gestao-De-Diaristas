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
  phone?: string;
  city?: string;
  state?: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: args.email,
    password: args.password,
    options: {
      emailRedirectTo: `${window.location.origin}/${args.role === "professional" ? "pro/profile" : "dashboard"}`,
      data: { full_name: args.fullName, role: args.role, ...(args.role === "professional" ? { phone: args.phone, city: args.city, state: args.state } : {}) },
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Não foi possível criar a conta.");
  if (!data.session) return { ok: true as const, pendingEmail: true as const };
  if (args.role === "professional") {
    const result = await supabase.from("profiles").update({ phone: args.phone, full_name: args.fullName }).eq("id", data.user.id).select("id,is_professional,phone").single();
    if (result.error) throw new Error("Falha ao salvar perfil: " + result.error.message);
    if (!result.data?.is_professional || !result.data.phone) throw new Error("O perfil profissional não foi criado corretamente. Entre em contato com o suporte.");
    const roles = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("role","professional").maybeSingle();
    if (roles.error || !roles.data) throw new Error("Não foi possível confirmar a permissão profissional.");
  }
  return { ok: true as const, pendingEmail: false as const };
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