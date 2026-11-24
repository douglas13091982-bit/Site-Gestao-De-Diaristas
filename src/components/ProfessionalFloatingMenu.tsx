import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Link, useLocation } from "@tanstack/react-router";
import { Bell, Briefcase, Calendar, Home, LayoutGrid, User, Wallet } from "lucide-react";
import type { DashboardModule } from "@/components/DashboardModuleGrid";

export const PRO_MODULES = [
  { to: "/pro/leads", label: "Serviços", icon: Briefcase, primary: true },
  { to: "/pro/agenda", label: "Agenda", icon: Calendar },
  { to: "/pro/carteira", label: "Carteira", icon: Wallet },
  { to: "/pro/profile", label: "Meu perfil", icon: User },
] satisfies DashboardModule[];

export const PROFESSIONAL_TABS = [{ to: "/pro", label: "Início", icon: Home }, ...PRO_MODULES];

const MENU_ITEMS = [...PROFESSIONAL_TABS, { to: "/notificacoes", label: "Notificações", icon: Bell }];

export function ProfessionalFloatingMenu() {
  const { pathname } = useLocation();
  const currentPath = pathname.replace(/\/$/, "");
  return (
    <DropdownMenu.Root key={pathname} modal={false}>
      <DropdownMenu.Trigger
        type="button"
        aria-label="Abrir menu da diarista"
        className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
      >
        <LayoutGrid className="size-6" aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="end"
          sideOffset={10}
          collisionPadding={12}
          aria-label="Menu da diarista"
          className="z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-48 overflow-y-auto rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg md:hidden"
        >
          {MENU_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = currentPath === to;
            return (
              <DropdownMenu.Item key={to} asChild>
                <Link
                  to={to}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground ${active ? "bg-primary/10 text-primary" : ""}`}
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
