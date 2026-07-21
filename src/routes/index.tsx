import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gersepa Solutions — Diaristas e serviços em SC" },
      { name: "description", content: "Encontre diaristas verificadas em Joinville, Florianópolis, Blumenau e outras cidades de Santa Catarina." },
      { property: "og:title", content: "Gersepa Solutions — Diaristas e serviços em SC" },
      { property: "og:description", content: "Encontre diaristas verificadas em cidades de Santa Catarina." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold">Gersepa</Link>
          <nav className="flex items-center gap-3">
            <Link to="/cities" className="text-sm hover:underline">Cidades</Link>
            <Link to="/professionals" className="text-sm hover:underline">Profissionais</Link>
            {user ? (
              <>
                <Link to="/dashboard"><Button size="sm" variant="outline">Meu painel</Button></Link>
                <Button size="sm" variant="ghost" onClick={() => signOut()}>Sair</Button>
              </>
            ) : (
              <Link to="/auth"><Button size="sm">Entrar</Button></Link>
            )}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-20 text-center space-y-6">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Sua casa limpa e organizada
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Encontre profissionais de limpeza qualificados perto de você, com avaliações reais e agendamento rápido.
        </p>
        <div className="flex gap-3 justify-center pt-4">
          <Link to="/quick-booking"><Button size="lg">Agendamento rápido</Button></Link>
          <Link to="/professionals"><Button size="lg" variant="outline">Ver profissionais</Button></Link>
        </div>
      </main>
    </div>
  );
}