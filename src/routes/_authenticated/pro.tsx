import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { DashboardModuleGrid, DashboardQuickAction, type DashboardModule } from "@/components/DashboardModuleGrid";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PushNotificationButton } from "@/components/PushNotificationButton";
import { Briefcase, Calendar, Wallet, User, Home, Bell, LayoutGrid } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pro")({
  head: () => ({ meta: [{ title: "Área da diarista — Gersepa Solutions" }, { name: "description", content: "Painel da diarista." }] }),
  component: ProLayout,
});

const PRO_MODULES = [
  { to: "/pro/leads", label: "Serviços", icon: Briefcase, primary: true },
  { to: "/pro/agenda", label: "Agenda", icon: Calendar },
  { to: "/pro/carteira", label: "Carteira", icon: Wallet },
  { to: "/pro/profile", label: "Meu perfil", icon: User },
] satisfies DashboardModule[];

function ProLayout() {
  const { user } = useAuth();
  const loc = useLocation();
  const profile = useQuery({
    queryKey: ["me-profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("is_professional,full_name,is_available,rating,total_bookings,profile_photo").eq("id", user!.id).maybeSingle()).data,
  });

  if (profile.isLoading) return <div className="min-h-screen bg-background"><Header /><main className="p-10 text-muted-foreground">Carregando…</main></div>;

  if (profile.data && !profile.data.is_professional) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-2xl mx-auto px-6 py-16 text-center">
          <h1 className="text-3xl font-bold">Torne-se uma diarista Gersepa</h1>
          <p className="text-muted-foreground mt-3">Complete o cadastro profissional para receber leads de clientes na sua cidade.</p>
          <Link to="/pro/profile" className="inline-flex mt-6 h-11 items-center justify-center rounded-md bg-primary px-6 text-primary-foreground font-medium">Completar perfil</Link>
        </main>
      </div>
    );
  }

  const isHome = loc.pathname === "/pro" || loc.pathname === "/pro/";
  const tabs = [{ to: "/pro", label: "Início", icon: Home }, ...PRO_MODULES];

  return (
    <div className="min-h-screen bg-background">
      <Header dashboardHome={isHome} />
      <main className={`mx-auto px-4 py-4 sm:py-8 ${isHome ? "max-w-[430px] pb-28 md:pb-8" : "max-w-6xl pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-8"}`}>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to="/pro/profile" className="shrink-0">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full overflow-hidden bg-muted border-2 border-primary/20">
              {profile.data?.profile_photo ? (
                <img src={profile.data.profile_photo} alt="Foto" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-lg sm:text-xl font-semibold text-muted-foreground">
                  {(profile.data?.full_name || "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl sm:text-3xl font-bold">Olá, {profile.data?.full_name?.split(" ")[0] ?? "diarista"}</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1">Painel profissional Gersepa</p>
          </div>
        </div>
        {isHome && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Nota" value={Number(profile.data?.rating ?? 0).toFixed(1)} />
              <Stat label="Serviços realizados" value={String(profile.data?.total_bookings ?? 0)} />
            </div>
            <PushNotificationButton label="Ativar alertas de leads" />
            <DashboardModuleGrid label="Menu da diarista" modules={PRO_MODULES} />
            <DashboardQuickAction to="/notificacoes" label="Notificações" icon={Bell} />
          </div>
        )}
        {!isHome && (
          <>
            <nav className="mt-4 sm:mt-6 hidden md:flex gap-1 border-b">
              {tabs.map((t) => {
                const active = t.to !== "/pro" && loc.pathname.startsWith(t.to);
                const Icon = t.icon;
                return (
                  <Link key={t.to} to={t.to} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px inline-flex items-center gap-2 ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4 sm:mt-6"><Outlet /></div>
          </>
        )}
      </main>
      {!isHome && (
        <DropdownMenu.Root key={loc.pathname} modal={false}>
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
              {tabs.map(({ to, label, icon: Icon }) => {
                const active = to !== "/pro" && loc.pathname.startsWith(to);
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
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-3 text-center">
      <div className="text-[11px] sm:text-xs text-muted-foreground">{label}</div>
      <div className="font-bold text-sm sm:text-base truncate">{value}</div>
    </div>
  );
}
