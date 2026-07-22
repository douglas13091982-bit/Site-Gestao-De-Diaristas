import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/cidades")({
  head: () => ({
    meta: [
      { title: "Cidades atendidas — Gersepa Solutions" },
      { name: "description", content: "Encontre diaristas verificadas nas cidades atendidas pela Gersepa." },
      { property: "og:title", content: "Cidades atendidas — Gersepa Solutions" },
      { property: "og:description", content: "Escolha sua cidade e encontre a diarista ideal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CitiesPage,
});

function CitiesPage() {
  const q = useQuery({
    queryKey: ["cities-public"],
    queryFn: async () => (await supabase.from("available_cities").select("id, name, slug, state").eq("is_enabled", true).order("display_order").order("name")).data ?? [],
  });
  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Cidades atendidas</h1>
        <p className="text-muted-foreground mb-8">Selecione sua cidade para ver as diaristas disponíveis.</p>
        {q.isLoading && <div className="text-muted-foreground">Carregando…</div>}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {q.data?.map((c) => (
            <Link key={c.id} to="/cidades/$slug" params={{ slug: c.slug }} className="bg-card border border-border rounded-xl p-4 hover:border-primary transition flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.state}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}