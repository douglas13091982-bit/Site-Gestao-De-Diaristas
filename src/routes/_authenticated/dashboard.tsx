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
  const isWorker = roles.includes("worker");
  const role = useQuery({
    queryKey: ["my-role", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("role","admin").maybeSingle()).data,
  });
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold">Meu painel</h1>
          <div className="flex gap-2">
            {isWorker && <Button asChild><Link to="/pro/leads">Área da diarista</Link></Button>}
            {role.data && <Button asChild variant="outline"><Link to="/admin">Painel Admin</Link></Button>}
          </div>
        </div>
        <p className="text-muted-foreground mt-2">
          Bem-vindo(a), {user?.email}. Em breve: seus agendamentos, créditos e leads.
        </p>
        {!isWorker && (
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