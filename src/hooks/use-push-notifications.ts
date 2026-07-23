import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { requestPushToken, onForegroundMessage } from "@/lib/firebase";
import { toast } from "sonner";

type Status = "unsupported" | "prompt" | "granted" | "denied";

/**
 * Gerencia notificações push (FCM):
 * - detecta suporte / permissão
 * - solicita permissão e salva o token FCM em `push_subscriptions`
 * - exibe toast quando chega mensagem em primeiro plano
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("prompt");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as Status);
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      if (status !== "granted") return;
      const off = await onForegroundMessage((raw) => {
        const payload = raw as { notification?: { title?: string; body?: string } };
        const title = payload.notification?.title || "Nova notificação";
        const body = payload.notification?.body || "";
        toast(title, { description: body });
      });
      unsub = typeof off === "function" ? off : undefined;
    })();
    return () => {
      unsub?.();
    };
  }, [status]);

  const enable = useCallback(async () => {
    if (!user) {
      toast.error("Faça login para ativar as notificações.");
      return;
    }
    if (status === "unsupported") {
      toast.error("Seu navegador não suporta notificações push.");
      return;
    }
    setBusy(true);
    try {
      const token = await requestPushToken();
      if (!token) {
        setStatus(Notification.permission as Status);
        toast.error("Permissão negada. Ative nas configurações do navegador.");
        return;
      }
      // Guarda o token FCM no campo endpoint; p256dh/auth são NOT NULL,
      // usamos marcadores fixos porque o FCM não usa esses campos VAPID.
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert(
          { user_id: user.id, endpoint: token, p256dh: "fcm", auth: "fcm" },
          { onConflict: "endpoint" },
        );
      if (error) throw error;
      setStatus("granted");
      toast.success("Notificações ativadas!");
    } catch (err) {
      console.error("[push] falha ao ativar", err);
      toast.error("Não foi possível ativar as notificações.");
    } finally {
      setBusy(false);
    }
  }, [user, status]);

  return { status, busy, enable };
}