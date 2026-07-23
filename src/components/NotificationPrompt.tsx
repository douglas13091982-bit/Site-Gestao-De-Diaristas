import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useAuth } from "@/hooks/use-auth";

const DISMISS_KEY = "gersepa:push-dismissed-at";
const DISMISS_MS = 1000 * 60 * 60 * 24 * 3; // 3 dias

/**
 * Banner global que solicita permissão de notificações para usuários logados
 * quando o navegador ainda não pediu (Notification.permission === "default").
 */
export function NotificationPrompt() {
  const { user } = useAuth();
  const { status, busy, enable } = usePushNotifications();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (status !== "prompt" && status !== ("default" as typeof status)) return;
    try {
      const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (ts && Date.now() - ts < DISMISS_MS) return;
    } catch {
      /* noop */
    }
    // Pequeno atraso para não competir com o splash / install prompt
    const t = setTimeout(() => setHidden(false), 1500);
    return () => clearTimeout(t);
  }, [user, status]);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
    setHidden(true);
  }

  async function activate() {
    await enable();
    setHidden(true);
  }

  if (hidden) return null;
  if (!user) return null;
  if (status === "granted" || status === "denied" || status === "unsupported") return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 z-[65] w-[min(92vw,420px)] rounded-2xl border border-border bg-background shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom">
      <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Bell className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-foreground">Ativar notificações</div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Receba alertas de novos agendamentos, confirmações e mensagens em tempo real.
        </p>
        <button
          onClick={activate}
          disabled={busy}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
        >
          <Bell className="h-4 w-4" /> {busy ? "Ativando..." : "Ativar agora"}
        </button>
      </div>
      <button
        type="button"
        aria-label="Fechar"
        onClick={dismiss}
        className="p-1 -m-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}