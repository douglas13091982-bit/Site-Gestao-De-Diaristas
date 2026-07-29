import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { requestPushToken, onForegroundMessage } from "@/lib/firebase";
import { toast } from "sonner";

type Status = "unsupported" | NotificationPermission;

function getPushStatus(): Status {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  return Notification.permission;
}

function isInsideFrame() {
  try {
    return typeof window !== "undefined" && window.self !== window.top;
  } catch {
    return true;
  }
}

function showBlockedInstructions() {
  toast.warning("Notificações bloqueadas neste dispositivo", {
    description:
      "O navegador/app está bloqueando o aviso. No Android: segure o ícone do app → Informações do app → Notificações → Permitir. No navegador: cadeado da URL → Configurações do site → Notificações → Perguntar/Permitir.",
    duration: 12000,
  });
}

function showFrameInstructions() {
  toast.info("Abra o app fora da pré-visualização", {
    description:
      "O pedido de permissão de notificação não aparece dentro do preview. Abra o app em nova aba, ou pelo APK/TWA instalado, e toque em ativar novamente.",
    duration: 10000,
    action: {
      label: "Abrir app",
      onClick: () => window.open(window.location.href, "_blank", "noopener,noreferrer"),
    },
  });
}

/**
 * Gerencia notificações push (FCM):
 * - detecta suporte / permissão
 * - solicita permissão e salva o token FCM em `push_subscriptions`
 * - exibe toast quando chega mensagem em primeiro plano
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("default");
  const [busy, setBusy] = useState(false);
  const inFrame = isInsideFrame();

  useEffect(() => {
    setStatus(getPushStatus());

    const refresh = () => setStatus(getPushStatus());
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    // O service worker avisa quando chega push, para vibrarmos também aqui.
    const onSwMessage = (event: MessageEvent) => {
      const msg = event.data as { type?: string; pattern?: number[] } | undefined;
      if (msg?.type !== "gersepa-vibrate") return;
      try {
        navigator.vibrate?.(msg.pattern ?? [300, 120, 300, 120, 400]);
      } catch { /* noop */ }
    };
    navigator.serviceWorker?.addEventListener("message", onSwMessage);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      if (status !== "granted") return;
      const off = await onForegroundMessage((raw) => {
        const payload = raw as {
          notification?: { title?: string; body?: string };
          data?: { title?: string; body?: string };
        };
        const title = payload.data?.title || payload.notification?.title || "Nova notificação";
        const body = payload.data?.body || payload.notification?.body || "";
        // Vibra o aparelho ao receber push com o app aberto.
        try {
          navigator.vibrate?.([300, 120, 300, 120, 400]);
        } catch { /* noop */ }
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
    if (getPushStatus() === "denied") {
      setStatus("denied");
      showBlockedInstructions();
      return;
    }
    if (isInsideFrame()) {
      showFrameInstructions();
      return;
    }
    setBusy(true);
    try {
      const token = await requestPushToken();
      if (!token) {
        const next = getPushStatus();
        setStatus(next);
        if (next === "denied") showBlockedInstructions();
        else toast.error("Não foi possível registrar este dispositivo para notificações.");
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
      const next = getPushStatus();
      setStatus(next);
      if (next === "denied") showBlockedInstructions();
      else toast.error("Não foi possível ativar as notificações. Abra o app fora do preview e tente novamente.");
    } finally {
      setBusy(false);
    }
  }, [user, status]);

  /**
   * Força a geração e o salvamento do token FCM para a conta logada,
   * mesmo quando a permissão do Android já está concedida.
   */
  const registerDevice = useCallback(async () => {
    if (!user) {
      toast.error("Faça login para registrar este dispositivo.");
      return false;
    }
    if (getPushStatus() === "unsupported") {
      toast.error("Seu navegador não suporta notificações push.");
      return false;
    }
    if (getPushStatus() === "denied") {
      setStatus("denied");
      showBlockedInstructions();
      return false;
    }
    if (isInsideFrame()) {
      showFrameInstructions();
      return false;
    }
    setBusy(true);
    try {
      const token = await requestPushToken();
      if (!token) {
        const next = getPushStatus();
        setStatus(next);
        if (next === "denied") showBlockedInstructions();
        else toast.error("Não foi possível gerar o token deste dispositivo.");
        return false;
      }
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert(
          { user_id: user.id, endpoint: token, p256dh: "fcm", auth: "fcm" },
          { onConflict: "endpoint" },
        );
      if (error) throw error;
      setStatus("granted");
      toast.success("Dispositivo registrado para esta conta!");
      return true;
    } catch (err) {
      console.error("[push] falha ao registrar dispositivo", err);
      toast.error("Não foi possível registrar este dispositivo. Tente novamente fora do preview.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [user]);

  return { status, busy, enable, registerDevice, inFrame };
}