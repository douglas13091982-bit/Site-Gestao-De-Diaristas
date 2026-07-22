import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Options = { userId: string | undefined; onNewOffer: () => void };

export function useLeadNotifications({ userId, onNewOffer }: Options) {
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`pro-offers-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "booking_offers", filter: `professional_id=eq.${userId}` },
        () => {
          onNewOffer();
          toast.success("Novo pedido chegou! Corre para aceitar 🏃‍♀️", { duration: 6000 });
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              new Notification("Novo pedido disponível!", {
                body: "Um cliente acabou de solicitar uma diarista. Quem aceitar primeiro leva.",
                icon: "/favicon.ico",
                tag: "gersepa-lead",
              });
            } catch { /* noop */ }
          }
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            try { navigator.vibrate?.([200, 100, 200]); } catch { /* noop */ }
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "booking_offers", filter: `professional_id=eq.${userId}` },
        () => onNewOffer(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, onNewOffer]);
}

export function useNotificationPermission() {
  const [status, setStatus] = useState<NotificationPermission | "unsupported">("default");
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) { setStatus("unsupported"); return; }
    setStatus(Notification.permission);
  }, []);
  async function request() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const res = await Notification.requestPermission();
    setStatus(res);
    if (res === "granted") {
      try { new Notification("Notificações ativadas ✅", { body: "Você será avisada assim que um novo pedido chegar." }); } catch { /* noop */ }
    }
  }
  return { status, request };
}