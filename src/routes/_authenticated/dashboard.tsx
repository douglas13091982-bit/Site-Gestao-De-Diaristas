import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Meu painel — Gersepa Solutions" },
      { name: "description", content: "Painel da sua conta na Gersepa Solutions." },
      { property: "og:title", content: "Painel — Gersepa Solutions" },
      { property: "og:description", content: "Área do usuário Gersepa Solutions." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, roles } = useAuth();
  const isWorker = roles.includes("professional");
  const role = useQuery({
    queryKey: ["my-role", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("role","admin").maybeSingle()).data,
  });
  const isAdmin = !!role.data;
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold">Meu painel</h1>
          <div className="flex gap-2">
            {isWorker && <Button asChild><Link to="/pro/leads">Área da diarista</Link></Button>}
            {isAdmin && <Button asChild variant="outline"><Link to="/admin">Painel Admin</Link></Button>}
          </div>
        </div>
        <p className="text-muted-foreground mt-2">
          Bem-vindo(a), {user?.email}. Em breve: seus agendamentos, créditos e leads.
        </p>
        {isAdmin ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AdminLink to="/admin" title="Visão Geral" desc="Métricas e estatísticas" />
            <AdminLink to="/admin/users" title="Usuários" desc="Gerenciar clientes e diaristas" />
            <AdminLink to="/admin/professionals" title="Profissionais" desc="Aprovar e gerenciar diaristas" />
            <AdminLink to="/admin/bookings" title="Agendamentos" desc="Todos os agendamentos" />
            <AdminLink to="/admin/finance" title="Receita & Comissão" desc="Financeiro da plataforma" />
            <AdminLink to="/admin/categories" title="Categorias" desc="Serviços oferecidos" />
            <AdminLink to="/admin/cities" title="Cidades" desc="Áreas de atuação" />
            <AdminLink to="/admin/settings" title="Configurações" desc="Ajustes gerais" />
          </div>
        ) : !isWorker && (
          <div className="mt-8 rounded-2xl border bg-card p-6">
            <h2 className="font-semibold">Seja uma diarista Gersepa</h2>
            <p className="text-sm text-muted-foreground mt-1">Cadastre-se para receber leads de clientes na sua cidade.</p>
            <Button asChild className="mt-3"><Link to="/onboarding">Iniciar cadastro profissional</Link></Button>
          </div>
        )}
      </main>
    </div>
  );
}

function AdminLink({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link to={to} className="rounded-2xl border bg-card p-5 hover:border-primary hover:shadow-sm transition">
      <div className="font-semibold text-foreground">{title}</div>
      <div className="text-sm text-muted-foreground mt-1">{desc}</div>
    </Link>
  );
}