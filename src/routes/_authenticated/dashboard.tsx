import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Calendar, Star, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [
    { title: "Meu painel — Gersepa Solutions" },
    { name: "description", content: "Painel da sua conta no Gersepa Solutions." },
    { property: "og:title", content: "Painel — Gersepa Solutions" },
    { property: "og:description", content: "Área do usuário Gersepa Solutions." },
  ] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, roles } = useAuth();
  const isWorker = roles.includes("worker");
  const isAdmin = roles.includes("admin");

  const profile = useQuery({
    queryKey: ["me", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  const upcoming = useQuery({
    queryKey: ["upcoming", user?.id, isWorker],
    enabled: !!user,
    queryFn: async () => {
      const col = isWorker ? "worker_id" : "client_id";
      const { data } = await supabase
        .from("bookings")
        .select("id, scheduled_at, status, total_price, address, client_id, worker_id")
        .eq(col, user!.id)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at").limit(10);
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Olá, {profile.data?.full_name ?? "usuário"}!</h1>
            <p className="text-muted-foreground">
              {isAdmin ? "Painel administrativo." : isWorker ? "Painel da diarista." : "Painel do cliente."}
            </p>
          </div>
          {!profile.data?.onboarding_completed && (
            <Link to="/onboarding"><Button>Completar perfil</Button></Link>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-2xl p-6">
            <Calendar className="h-6 w-6 text-primary mb-2" />
            <div className="text-2xl font-bold">{upcoming.data?.length ?? 0}</div>
            <div className="text-sm text-muted-foreground">Próximos agendamentos</div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <Star className="h-6 w-6 text-accent mb-2" />
            <div className="text-2xl font-bold">{Number(profile.data?.rating_avg ?? 0).toFixed(1)}</div>
            <div className="text-sm text-muted-foreground">{profile.data?.rating_count ?? 0} avaliações</div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <Users className="h-6 w-6 text-primary mb-2" />
            <div className="text-2xl font-bold">{profile.data?.is_verified ? "Sim" : "Não"}</div>
            <div className="text-sm text-muted-foreground">Perfil verificado</div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <Link to="/bookings" className="p-5 bg-card border border-border rounded-2xl hover:shadow-md transition">
            <div className="font-semibold">Meus agendamentos</div>
            <div className="text-xs text-muted-foreground">Ver histórico e status</div>
          </Link>
          {isWorker && (
            <Link to="/schedule" className="p-5 bg-card border border-border rounded-2xl hover:shadow-md transition">
              <div className="font-semibold">Minha agenda</div>
              <div className="text-xs text-muted-foreground">Serviços e disponibilidade</div>
            </Link>
          )}
          {!isWorker && (
            <Link to="/professionals" className="p-5 bg-card border border-border rounded-2xl hover:shadow-md transition">
              <div className="font-semibold">Encontrar diarista</div>
              <div className="text-xs text-muted-foreground">Buscar profissionais</div>
            </Link>
          )}
          <Link to="/onboarding" className="p-5 bg-card border border-border rounded-2xl hover:shadow-md transition">
            <div className="font-semibold">Editar perfil</div>
            <div className="text-xs text-muted-foreground">Atualizar dados</div>
          </Link>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-bold mb-4">Próximos serviços</h2>
          {upcoming.data?.length ? (
            <ul className="divide-y divide-border">
              {upcoming.data.map((b) => (
                <li key={b.id} className="py-3 flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{new Date(b.scheduled_at).toLocaleString("pt-BR")}</div>
                    <div className="text-xs text-muted-foreground">{b.address ?? "—"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">R$ {Number(b.total_price).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground capitalize">{b.status}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-muted-foreground text-sm">Nenhum agendamento próximo.</div>
          )}
        </div>
      </div>
    </div>
  );
}
