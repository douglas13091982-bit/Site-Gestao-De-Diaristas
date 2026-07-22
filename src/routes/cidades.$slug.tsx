import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Star, MapPin, ShieldCheck } from "lucide-react";

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
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, city, profession_category, bio, rating, total_reviews, is_verified").eq("city_slug", slug).eq("is_verified", true).order("rating", { ascending: false }).limit(60)).data ?? [],
  });
  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Link to="/cidades" className="text-sm text-muted-foreground hover:text-primary">← Todas as cidades</Link>
        <h1 className="text-3xl font-bold mt-2">Diaristas em {city.data?.name ?? "…"}</h1>
        <p className="text-muted-foreground mb-8">{pros.data?.length ?? 0} profissionais verificadas.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pros.data?.map((p) => (
            <Link key={p.id} to="/professionals/$id" params={{ id: p.id }} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary grid place-items-center font-bold">{(p.full_name ?? "?")[0]}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold flex items-center gap-1 truncate">{p.full_name}{p.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-accent" />}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{p.city}</div>
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold"><Star className="h-3.5 w-3.5 fill-accent text-accent" />{Number(p.rating ?? 0).toFixed(1)}</div>
              </div>
              {p.profession_category && <span className="inline-block mt-3 text-[10px] uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full">{p.profession_category}</span>}
              {p.bio && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{p.bio}</p>}
            </Link>
          ))}
          {!pros.isLoading && !pros.data?.length && <div className="text-muted-foreground col-span-full text-center py-16">Nenhuma diarista nesta cidade ainda.</div>}
        </div>
      </div>
    </div>
  );
}