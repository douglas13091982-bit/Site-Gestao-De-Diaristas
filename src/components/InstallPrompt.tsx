import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "gersepa:install-dismissed-at";
const DISMISS_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    window.navigator.standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (ts && Date.now() - ts < DISMISS_MS) return;
    } catch {
      /* noop */
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt as EventListener);

    const onInstalled = () => {
      setDeferred(null);
      setHidden(true);
    };
    window.addEventListener("appinstalled", onInstalled);

    if (isIos()) {
      setShowIos(true);
      setHidden(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt as EventListener);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
    setHidden(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    setDeferred(null);
    setHidden(true);
  }

  if (hidden) return null;
  if (!deferred && !showIos) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 z-[70] w-[min(92vw,420px)] rounded-2xl border border-border bg-background shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom">
      <img src="/icons/icon-192.png" alt="" className="w-11 h-11 rounded-xl" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-foreground">Instalar Gersepa Solutions</div>
        {deferred ? (
          <p className="text-sm text-muted-foreground mt-0.5">
            Adicione o app à sua tela inicial para acesso rápido e experiência de app nativo.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
            Toque em <Share className="inline h-4 w-4" /> e depois em <b>"Adicionar à Tela de Início"</b>.
          </p>
        )}
        {deferred && (
          <button
            onClick={install}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"
          >
            <Download className="h-4 w-4" /> Instalar app
          </button>
        )}
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