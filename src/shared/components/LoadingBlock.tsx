import { Loader2 } from "lucide-react";

type Props = { label?: string; className?: string };

export function LoadingBlock({ label = "Carregando…", className }: Props) {
  return (
    <div
      className={
        "flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground " +
        (className ?? "")
      }
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}