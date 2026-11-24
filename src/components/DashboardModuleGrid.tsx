import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export type DashboardModule = {
  to: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
};

export function DashboardModuleGrid({
  label,
  modules,
  badges,
}: {
  label: string;
  modules: readonly DashboardModule[];
  badges?: Record<string, number>;
}) {
  return (
    <nav aria-label={label}>
      <ul className="grid grid-cols-2 gap-3 min-[400px]:grid-cols-3">
        {modules.map(({ to, label, icon: Icon, primary }) => {
          const count = badges?.[to] ?? 0;
          return (
            <li key={to} className="min-w-0">
              <Link
                to={to}
                className={`relative flex h-full min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:active:scale-[.97] ${primary ? "border-primary bg-primary text-primary-foreground hover:opacity-90" : "border-border bg-card text-card-foreground hover:border-primary hover:bg-accent"}`}
              >
                <Icon aria-hidden="true" className={`size-[30px] shrink-0 ${primary ? "" : "text-primary"}`} />
                <span className="w-full break-words text-sm font-semibold leading-tight">{label}</span>
                {count > 0 && (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                    {count > 99 ? "99+" : count}
                    <span className="sr-only"> pendências</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DashboardQuickAction({ to, label, icon: Icon }: DashboardModule) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 grid size-[72px] place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:active:scale-[.97] md:hidden"
    >
      <Icon className="size-7" aria-hidden="true" />
    </Link>
  );
}
