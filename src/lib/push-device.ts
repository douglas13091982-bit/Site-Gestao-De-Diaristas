import { supabase } from "@/integrations/supabase/client";
import { renewPushToken, requestPushToken } from "@/lib/firebase";

const REGISTRATION_KEY = "gersepa:push-device";

export async function registerPushDevice(userId: string): Promise<boolean> {
  const token = await requestPushToken();
  if (!token) return false;

  const save = (endpoint: string) => supabase.from("push_subscriptions")
    .upsert({ user_id: userId, endpoint, p256dh: "fcm", auth: "fcm" }, { onConflict: "endpoint" })
    .select("id")
    .single();

  let registration = await save(token);
  if (registration.error?.code === "42501" || registration.error?.code === "23505") {
    const { data: profile, error } = await supabase.from("profiles")
      .select("id").eq("id", userId).maybeSingle();
    if (error) throw new Error("Não foi possível verificar seu cadastro. Tente novamente.");
    if (!profile) throw new Error("O perfil desta conta está incompleto. Complete o cadastro para ativar as notificações.");

    // O Firebase identifica esta instalação do app. Ao trocar de conta,
    // invalide o token antigo em vez de tentar sobrescrever o registro de outra pessoa.
    const renewedToken = await renewPushToken();
    if (!renewedToken || renewedToken === token) {
      throw new Error("Não foi possível renovar o registro deste dispositivo. Tente registrar novamente.");
    }
    registration = await save(renewedToken);
  }

  if (registration.error?.code === "23503") {
    throw new Error("O perfil desta conta está incompleto. Complete o cadastro para ativar as notificações.");
  }
  if (registration.error || !registration.data) {
    throw new Error("Não foi possível vincular este dispositivo à sua conta. Verifique a conexão e tente novamente.");
  }

  try {
    localStorage.setItem(REGISTRATION_KEY, JSON.stringify({ userId, id: registration.data.id }));
  } catch {
    // O navegador pode bloquear armazenamento local.
  }
  return true;
}

export async function detachPushDevice(userId: string) {
  const raw = localStorage.getItem(REGISTRATION_KEY);
  if (!raw) return;
  const registration = JSON.parse(raw) as { userId?: string; id?: unknown };
  if (registration.userId !== userId || typeof registration.id !== "number") return;
  const { error } = await supabase.from("push_subscriptions").delete()
    .eq("id", registration.id).eq("user_id", userId);
  if (error) throw new Error("Não foi possível desvincular as notificações deste dispositivo.");
  if (localStorage.getItem(REGISTRATION_KEY) === raw) localStorage.removeItem(REGISTRATION_KEY);
}
