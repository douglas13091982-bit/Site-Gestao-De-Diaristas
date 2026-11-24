import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useLocation } from "@tanstack/react-router";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useAuth } from "@/hooks/use-auth";
import { isPushDeviceRegistered } from "@/lib/push-device";

const DISMISS_MS = 3 * 24 * 60 * 60 * 1000;

export function NotificationPrompt() {
  const { user, roles, loading } = useAuth();
  const { pathname } = useLocation();
  const { status, busy, registerDevice, inFrame } = usePushNotifications({ listen: true });
  const [promptUser, setPromptUser] = useState<string | null>(null);
  const dismissed = useRef(new Set<string>());

  const userId = user?.id;
  const professionalHome = (pathname === "/pro" || pathname === "/pro/") && roles.includes("professional");
  const clientHome = (pathname === "/cliente" || pathname === "/cliente/") && roles.includes("client");
  const eligible = !!userId && !loading && !inFrame && (professionalHome || clientHome)
    && (status === "default" || status === "granted");

  useEffect(() => {
    if (!eligible || !userId || dismissed.current.has(userId)) return;
    if (status === "granted" && isPushDeviceRegistered(userId)) return;
    try {
      const until = Number(localStorage.getItem(`gersepa:push-dismissed-until:${userId}`));
      if (until > Date.now()) return;
    } catch {
      // A preferência ainda vale nesta sessão.
    }
    const timer = window.setTimeout(() => {
      if (!dismissed.current.has(userId) && !(status === "granted" && isPushDeviceRegistered(userId))) setPromptUser(userId);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [eligible, status, userId]);

  useEffect(() => {
    if (!eligible) setPromptUser(null);
  }, [eligible]);

  function dismiss() {
    if (!userId || busy) return;
    dismissed.current.add(userId);
    try {
      localStorage.setItem(`gersepa:push-dismissed-until:${userId}`, String(Date.now() + DISMISS_MS));
    } catch {
      // A preferência ainda vale nesta sessão.
    }
    setPromptUser(null);
  }

  async function activate() {
    if (!(await registerDevice())) return;
    if (userId) dismissed.current.add(userId);
    setPromptUser(null);
  }

  return (
    <Dialog.Root open={eligible && promptUser === userId} onOpenChange={(open) => { if (!open) dismiss(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/45" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[71] grid max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 gap-3 overflow-auto rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xl">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <BellRing className="size-5" aria-hidden="true" />
          </span>
          <Dialog.Title className="text-lg font-bold">Ativar notificações</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            {professionalHome
              ? "Receba avisos de novos serviços e atualizações dos seus agendamentos."
              : "Receba confirmações e atualizações dos seus agendamentos."}
          </Dialog.Description>
          <div className="mt-1 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" className="min-h-11" disabled={busy} onClick={dismiss}>Agora não</Button>
            <Button type="button" className="min-h-11" disabled={busy} onClick={() => void activate()}>
              {busy ? "Ativando…" : status === "granted" ? "Registrar dispositivo" : "Ativar notificações"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
