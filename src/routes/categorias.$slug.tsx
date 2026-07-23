import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { ProfessionalCard } from "@/components/ProfessionalCard";

export const Route = createFileRoute("/categorias/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Diaristas verificadas · Gersepa Solutions` },
      { name: "description", content: `Profissionais da categoria ${params.slug}.` },
      { property: "og:title", content: `${params.slug} — Gersepa` },
      { property: "og:description", content: `Diaristas da categoria ${params.slug}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const cat = useQuery({
    queryKey: ["cat", slug],
    queryFn: async () => {
      const { data } = await supabase.from("profession_categories").select("*").eq("slug", slug).eq("is_enabled", true).maybeSingle();
      if (!data) throw notFound();
      return data;
    },
  });
  const pros = useQuery({
    queryKey: ["pros-cat", slug],
    queryFn: async () => (await supabase.rpc("list_public_professionals", { _category: slug, _limit: 60 })).data ?? [],
  });
  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Link to="/categorias" className="text-sm text-muted-foreground hover:text-primary">← Todas as categorias</Link>
        <h1 className="text-3xl font-bold mt-2">{cat.data?.name ?? "Categoria"}</h1>
        {cat.data?.description && <p className="text-muted-foreground mb-6">{cat.data.description}</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {pros.data?.map((p) => <ProfessionalCard key={p.id} p={p} />)}
          {!pros.isLoading && !pros.data?.length && <div className="text-muted-foreground col-span-full text-center py-16">Nenhuma diarista nesta categoria ainda.</div>}
        </div>
      </div>
    </div>
  );
}