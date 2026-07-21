import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Meu painel — Gersepa" },
      { name: "description", content: "Painel do usuário Gersepa Solutions." },
      { property: "og:title", content: "Meu painel — Gersepa" },
      { property: "og:description", content: "Painel do usuário Gersepa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, roles, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold">Gersepa</Link>
          <Button size="sm" variant="ghost" onClick={() => signOut()}>Sair</Button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-6">
        <h1 className="text-3xl font-bold">Olá, {user?.user_metadata?.name ?? user?.email}</h1>
        <p className="text-muted-foreground">
          Papéis: {roles.length ? roles.join(", ") : "cliente"}
        </p>
        <p className="text-sm text-muted-foreground">
          O restante do painel (agendamentos, perfil, painel do profissional/admin) será construído nas próximas fases.
        </p>
      </main>
    </div>
  );
}