import { Bell, BellRing, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
  if (status === "denied") {
    return (
      <Button
        size="sm"
        variant="outline"
        className="gap-2 border-amber-300 text-amber-700"
        onClick={() =>
          toast.info("Notificações bloqueadas", {
            description:
              "Abra as configurações do app/navegador → Permissões → Notificações e ative para este site. Depois recarregue a página.",
            duration: 8000,
          })
        }
      >
        <BellOff className="h-4 w-4" /> Notificações bloqueadas
      </Button>
    );
  }
  return (
    <Button onClick={enable} disabled={busy} size="sm" variant="outline" className="gap-2">
      <Bell className="h-4 w-4" />
      {busy ? "Ativando..." : label}
    </Button>
  );
}