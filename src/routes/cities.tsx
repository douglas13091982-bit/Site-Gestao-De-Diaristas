import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cities")({
  head: () => ({
    meta: [
      { title: "Cidades atendidas — Gersepa Solutions" },
      { name: "description", content: "Veja em quais cidades de Santa Catarina a Gersepa Solutions oferece serviços de limpeza e diaristas." },
      { property: "og:title", content: "Cidades atendidas — Gersepa Solutions" },
      { property: "og:description", content: "Cidades atendidas pela Gersepa em Santa Catarina." },
    ],
  }),
  component: CitiesPage,
});

function CitiesPage() {
  const q = useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("available_cities")
        .select("id, name, slug, state, display_order")
        .eq("is_enabled", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold">Gersepa</Link>
          <Link to="/professionals"><Button size="sm" variant="outline">Ver profissionais</Button></Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-6">
        <h1 className="text-3xl font-bold">Cidades atendidas</h1>
        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : q.error ? (
          <p className="text-sm text-destructive">Erro: {(q.error as Error).message}</p>
        ) : q.data && q.data.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {q.data.map((c) => (
              <li key={c.id} className="rounded-md border border-border p-4">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.state ?? ""}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma cidade cadastrada ainda.</p>
        )}
      </main>
    </div>
  );
}