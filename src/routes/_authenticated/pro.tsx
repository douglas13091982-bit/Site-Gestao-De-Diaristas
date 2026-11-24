import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { DashboardModuleGrid } from "@/components/DashboardModuleGrid";
import { PROFESSIONAL_TABS, PRO_MODULES, ProfessionalFloatingMenu } from "@/components/ProfessionalFloatingMenu";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/pro")({
  head: () => ({ meta: [{ title: "Área da diarista — Gersepa Solutions" }, { name: "description", content: "Painel da diarista." }] }),
  component: ProLayout,
});

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
            <DashboardModuleGrid label="Menu da diarista" modules={PRO_MODULES} />
          </div>
        )}
        {!isHome && (
          <>
            <nav className="mt-4 sm:mt-6 hidden md:flex gap-1 border-b">
              {PROFESSIONAL_TABS.map((t) => {
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
      <ProfessionalFloatingMenu />
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
