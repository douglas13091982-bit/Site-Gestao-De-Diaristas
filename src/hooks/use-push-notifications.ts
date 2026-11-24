import { useCallback, useEffect, useState } from "react";
import { registerPushDevice } from "@/lib/push-device";
import { useAuth } from "@/hooks/use-auth";
import { onForegroundMessage, FCM_WORKER_SCOPE } from "@/lib/firebase";
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
export function usePushNotifications({ listen = false } = {}) {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("default");
  const [busy, setBusy] = useState(false);
  const inFrame = isInsideFrame();

  useEffect(() => {
    setStatus(getPushStatus());

    const refresh = () => setStatus(getPushStatus());
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  useEffect(() => {
    if (!listen || !user || status !== "granted") return;
    let cancelled = false;
    let unsub: (() => void) | undefined;
    (async () => {
      const off = await onForegroundMessage((raw) => {
        const payload = raw as {
          notification?: { title?: string; body?: string };
          data?: { title?: string; body?: string; tag?: string; link?: string; image?: string; systemNotification?: string };
        };
        const title = payload.data?.title || payload.notification?.title || "Nova notificação";
        const body = payload.data?.body || payload.notification?.body || "";
        if (payload.data?.systemNotification === "true") {
          const { tag, link, image } = payload.data;
          const scope = new URL(FCM_WORKER_SCOPE, window.location.origin).href;
          void navigator.serviceWorker.getRegistration(scope).then(async (registration) => {
            if (!registration) throw new Error("Service worker do Firebase indisponível");
            const options: NotificationOptions & { image?: string } = {
              body,
              tag,
              badge: "/icons/badge-96-v3.png",
              ...(/Android/i.test(navigator.userAgent) ? {} : { icon: "/icons/icon-192.png" }),
              ...(image ? { image } : {}),
              data: { url: link || "/" },
            };
            await registration.showNotification(title, options);
          }).catch((error) => console.warn("[push] falha ao exibir notificação do sistema", error));
          return;
        }
        // Vibra o aparelho ao receber push com o app aberto.
        try {
          navigator.vibrate?.([300, 120, 300, 120, 400]);
        } catch { /* noop */ }
        toast(title, { description: body });
      });
      if (cancelled) off();
      else unsub = off;
    })().catch((error) => console.warn("[push] falha no listener", error));
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [listen, status, user]);

  const registerDevice = useCallback(async () => {
    if (!user) {
      toast.error("Faça login para registrar este dispositivo.");
      return false;
    }
    const currentStatus = getPushStatus();
    if (currentStatus === "unsupported") {
      toast.error("Seu navegador não suporta notificações push.");
      return false;
    }
    if (currentStatus === "denied") {
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
      if (!(await registerPushDevice(user.id))) {
        if (getPushStatus() === "denied") showBlockedInstructions();
        else toast.error("Não foi possível obter o registro de push deste dispositivo.");
        return false;
      }
      toast.success("Dispositivo registrado para esta conta!");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar este dispositivo.");
      return false;
    } finally {
      setStatus(getPushStatus());
      setBusy(false);
    }
  }, [user]);

  const enable = registerDevice;

  return { status, busy, enable, registerDevice, inFrame };
}
