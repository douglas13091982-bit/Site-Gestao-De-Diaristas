import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";

export const Route = createFileRoute("/categorias")({
  head: () => ({
    meta: [
      { title: "Categorias de serviços — Gersepa Solutions" },
      { name: "description", content: "Faxineiras, passadeiras, cozinheiras e mais. Escolha a categoria e encontre profissionais." },
      { property: "og:title", content: "Categorias de serviços — Gersepa" },
      { property: "og:description", content: "Categorias de serviços domésticos com diaristas verificadas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const q = useQuery({
    queryKey: ["cats-public"],
    queryFn: async () => (await supabase.from("profession_categories").select("id, slug, name, icon, description, min_hourly_rate, max_hourly_rate").eq("is_enabled", true).order("display_order")).data ?? [],
  });
  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Categorias</h1>
        <p className="text-muted-foreground mb-8">Escolha o tipo de serviço que você precisa.</p>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {q.data?.map((c) => (
            <Link key={c.id} to="/categorias/$slug" params={{ slug: c.slug }} className="bg-card border border-border rounded-2xl p-6 hover:border-primary transition">
              <div className="text-3xl mb-2">{c.icon ?? "🧹"}</div>
              <div className="font-bold text-lg">{c.name}</div>
              {c.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
              {c.min_hourly_rate && <div className="mt-3 text-sm text-primary font-semibold">R$ {Number(c.min_hourly_rate).toFixed(0)}–{Number(c.max_hourly_rate ?? c.min_hourly_rate).toFixed(0)}/h</div>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}