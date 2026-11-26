import { supabase } from "@/integrations/supabase/client";
import { sendPasswordSetupEmail } from "@/lib/account.functions";

export function normalizeLoginPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!/^(?:55)?[1-9][0-9]9[0-9]{8}$/.test(digits)) throw new Error("Informe um WhatsApp válido com DDD.");
  return "+" + (digits.length === 11 ? "55" + digits : digits);
}
export type LoginRole = "client" | "professional";

/**
 * Login com senha. Nunca revela se o e-mail existe: em caso de credenciais
 * inválidas, apenas propaga o erro para exibição genérica na UI.
 */
export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword(email.includes("@") ? { email, password } : { phone: normalizeLoginPhone(email), password });
  if (error) throw error;
  return { ok: true as const };
}

/**
 * Cria uma nova conta. Nunca sonda a existência do e-mail antes; deixa o
 * Supabase decidir. Em qualquer erro do provedor, propaga para a UI.
 */
export async function signUpAccount(args: {
  email?: string;
  password: string;
  fullName: string;
  role: LoginRole;
  phone?: string;
  city?: string;
  state?: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    phone: normalizeLoginPhone(args.phone ?? ""),
    password: args.password,
    options: {
      data: { full_name: args.fullName, role: args.role, phone: normalizeLoginPhone(args.phone ?? "").slice(1) },
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Não foi possível criar a conta.");
  if (!data.session) throw new Error("A autenticação por telefone exige configuração no servidor. Procure o suporte.");
  {
    const result = await supabase.from("profiles").update({ phone: args.phone, full_name: args.fullName }).eq("id", data.user.id).select("id,is_professional,phone").single();
    if (result.error) throw new Error("Falha ao salvar perfil: " + result.error.message);
    if (!result.data || (args.role === "professional" && !result.data.is_professional) || !result.data.phone) throw new Error("O perfil profissional não foi criado corretamente. Entre em contato com o suporte.");
    const roles = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("role",args.role).maybeSingle();
    if (roles.error || !roles.data) throw new Error("Não foi possível confirmar a permissão da conta.");
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