import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { ProfessionalCard } from "@/components/ProfessionalCard";

export const Route = createFileRoute("/cidades/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Diaristas em ${params.slug.replace(/-/g, " ")} — Gersepa Solutions` },
      { name: "description", content: `Diaristas verificadas atendendo ${params.slug.replace(/-/g, " ")}.` },
      { property: "og:title", content: `Diaristas em ${params.slug.replace(/-/g, " ")}` },
      { property: "og:description", content: `Encontre a diarista ideal em ${params.slug.replace(/-/g, " ")}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CityPage,
});

function CityPage() {
  const { slug } = Route.useParams();
  const city = useQuery({
    queryKey: ["city", slug],
    queryFn: async () => {
      const { data } = await supabase.from("available_cities").select("*").eq("slug", slug).eq("is_enabled", true).maybeSingle();
      if (!data) throw notFound();
      return data;
    },
  });
  const pros = useQuery({
    queryKey: ["pros-city", slug],
    queryFn: async () => (await supabase.rpc("list_public_professionals", { _city_slug: slug, _limit: 60 })).data ?? [],
  });
  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Link to="/cidades" className="text-sm text-muted-foreground hover:text-primary">← Todas as cidades</Link>
        <h1 className="text-3xl font-bold mt-2">Diaristas em {city.data?.name ?? "…"}</h1>
        <p className="text-muted-foreground mb-8">{pros.data?.length ?? 0} profissionais verificadas.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pros.data?.map((p) => <ProfessionalCard key={p.id} p={p} />)}
          {!pros.isLoading && !pros.data?.length && <div className="text-muted-foreground col-span-full text-center py-16">Nenhuma diarista nesta cidade ainda.</div>}
        </div>
      </div>
    </div>
  );
}