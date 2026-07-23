import { Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";

/** Botão de ativação de notificações push (aparece apenas em contextos suportados). */
export function PushNotificationButton({ label = "Ativar notificações" }: { label?: string }) {
  const { status, busy, enable } = usePushNotifications();

  if (status === "unsupported") return null;
  if (status === "granted") {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
        <BellRing className="h-4 w-4" /> Notificações ativas
      </div>
    );
  }
  return (
    <Button onClick={enable} disabled={busy} size="sm" variant="outline" className="gap-2">
      <Bell className="h-4 w-4" />
      {busy ? "Ativando..." : label}
    </Button>
  );
}