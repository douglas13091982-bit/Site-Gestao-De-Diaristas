import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
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
          <Link to="/onboarding" className="inline-flex mt-6 h-11 items-center justify-center rounded-md bg-primary px-6 text-primary-foreground font-medium">Iniciar cadastro</Link>
        </main>
      </div>
    );
  }

  const tabs = [
    { to: "/pro/leads", label: "Serviços" },
    { to: "/pro/agenda", label: "Agenda" },
    { to: "/pro/profile", label: "Meu perfil" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 pb-24 md:pb-8">
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
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:gap-3 sm:justify-end text-sm">
          <Stat label="Nota" value={Number(profile.data?.rating ?? 0).toFixed(1)} />
          <Stat label="Serviços" value={String(profile.data?.total_bookings ?? 0)} />
        </div>
        <nav className="mt-4 sm:mt-6 hidden md:flex gap-1 border-b">
          {tabs.map((t) => {
            const active = loc.pathname.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 sm:mt-6"><Outlet /></div>
      </main>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border grid grid-cols-3 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((t) => {
          const active = loc.pathname.startsWith(t.to);
          return (
            <Link key={t.to} to={t.to} className={`flex items-center justify-center py-3 text-xs font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2 text-center sm:text-left">
      <div className="text-[11px] sm:text-xs text-muted-foreground">{label}</div>
      <div className="font-bold text-sm sm:text-base truncate">{value}</div>
    </div>
  );
}