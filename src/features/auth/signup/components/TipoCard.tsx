import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  tone: "client" | "professional";
  active: boolean;
  onClick: () => void;
};

export function TipoCard({ icon, title, subtitle, tone, active, onClick }: Props) {
  const activeClasses =
    tone === "client"
      ? "bg-primary text-primary-foreground border-primary"
      : "bg-orange-500 text-white border-orange-500";
  const idleClasses =
    tone === "client"
      ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
      : "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border-2 p-6 text-center transition flex flex-col items-center gap-2 ${
        active ? activeClasses : idleClasses
      }`}
    >
      {icon}
      <div className="font-bold text-lg mt-1">{title}</div>
      <div className={`text-sm ${active ? "opacity-90" : "opacity-80"}`}>{subtitle}</div>
    </button>
  );
}