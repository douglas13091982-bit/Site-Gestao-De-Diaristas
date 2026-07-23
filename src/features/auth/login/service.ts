import { supabase } from "@/integrations/supabase/client";
import { checkEmailRegistered, sendPasswordSetupEmail } from "@/lib/account.functions";

export type LoginRole = "client" | "professional";

export type EmailCheckResult = { exists: boolean };

/**
 * Signs the user in with password.
 * When the email exists but credentials fail, throws { needsSetup: true }
 * so the UI can offer the password-setup flow.
 */
export async function signInWithPassword(
  email: string,
  password: string,
  checkEmail: (args: { data: { email: string } }) => Promise<EmailCheckResult>,
) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) return { ok: true as const };
  const msg = error.message.toLowerCase();
  if (msg.includes("invalid") || msg.includes("credentials")) {
    const check = await checkEmail({ data: { email } });
    if (check.exists) return { ok: false as const, needsSetup: true as const };
  }
  throw error;
}

/**
 * Creates a new account. If the email is already registered, returns
 * `{ needsSetup: true }` so the UI can prompt password recovery.
 */
export async function signUpAccount(
  args: { email: string; password: string; fullName: string; role: LoginRole },
  checkEmail: (input: { data: { email: string } }) => Promise<EmailCheckResult>,
) {
  const check = await checkEmail({ data: { email: args.email } });
  if (check.exists) return { ok: false as const, needsSetup: true as const };

  const { error } = await supabase.auth.signUp({
    email: args.email,
    password: args.password,
    options: {
      emailRedirectTo: `${window.location.origin}/onboarding`,
      data: { full_name: args.fullName, role: args.role },
    },
  });
  if (error) throw error;
  return { ok: true as const };
}

/**
 * Verifica se o e-mail existe e dispara o link de criação/redefinição de senha.
 * Retorna `{ notRegistered: true }` quando o e-mail não existe.
 */
export async function requestPasswordSetupEmail(
  email: string,
  checkEmail: (input: { data: { email: string } }) => Promise<EmailCheckResult>,
  sendSetup: (input: { data: { email: string; redirectTo: string } }) => Promise<unknown>,
) {
  const check = await checkEmail({ data: { email } });
  if (!check.exists) return { ok: false as const, notRegistered: true as const };
  await sendSetup({
    data: { email, redirectTo: `${window.location.origin}/reset-password` },
  });
  return { ok: true as const };
}

// Re-export server-fn refs so components import a single feature entry.
export { checkEmailRegistered, sendPasswordSetupEmail };