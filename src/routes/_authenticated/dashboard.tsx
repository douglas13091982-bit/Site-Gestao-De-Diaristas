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
  const { user } = useAuth();
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
          {role.data && <Button asChild><Link to="/admin">Abrir Painel Admin</Link></Button>}
        </div>
        <p className="text-muted-foreground mt-2">
          Bem-vindo(a), {user?.email}. Em breve: seus agendamentos, créditos e leads.
        </p>
      </main>
    </div>
  );
}