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
    queryFn: async () => (await supabase.from("profiles").select("is_professional,full_name,is_available,credits_balance,rating,total_bookings").eq("id", user!.id).maybeSingle()).data,
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
    { to: "/pro/leads", label: "Leads" },
    { to: "/pro/agenda", label: "Agenda" },
    { to: "/pro/profile", label: "Meu perfil" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Olá, {profile.data?.full_name?.split(" ")[0] ?? "diarista"}</h1>
            <p className="text-muted-foreground text-sm mt-1">Painel profissional Gersepa</p>
          </div>
          <div className="flex gap-3 text-sm">
            <Stat label="Nota" value={Number(profile.data?.rating ?? 0).toFixed(1)} />
            <Stat label="Serviços" value={String(profile.data?.total_bookings ?? 0)} />
            <Stat label="Créditos" value={`R$ ${Number(profile.data?.credits_balance ?? 0).toFixed(2)}`} />
          </div>
        </div>
        <nav className="mt-6 flex gap-1 border-b">
          {tabs.map((t) => {
            const active = loc.pathname.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6"><Outlet /></div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}