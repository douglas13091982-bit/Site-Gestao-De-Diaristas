import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Star, MapPin } from "lucide-react";

const search = z.object({
  city: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
});

export const Route = createFileRoute("/professionals")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Diaristas verificadas — BabyClean" },
      { name: "description", content: "Busque diaristas por cidade, nota e disponibilidade." },
      { property: "og:title", content: "Diaristas — BabyClean" },
      { property: "og:description", content: "Encontre a diarista ideal na sua região." },
    ],
  }),
  component: ProfessionalsPage,
});

function ProfessionalsPage() {
  const s = Route.useSearch();
  const nav = Route.useNavigate();

  const q = useQuery({
    queryKey: ["pros", s.city ?? "", s.minRating ?? 0],
    queryFn: async () => {
      let qb = supabase
        .from("profiles")
        .select("id, full_name, city, state, bio, rating_avg, rating_count, avatar_url")
        .eq("is_verified", true)
        .order("rating_avg", { ascending: false })
        .limit(60);
      if (s.city) qb = qb.ilike("city", `%${s.city}%`);
      if (s.minRating) qb = qb.gte("rating_avg", s.minRating);
      const { data, error } = await qb;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Diaristas verificadas</h1>
          <p className="text-muted-foreground">Filtre por cidade e avaliação.</p>
        </div>

        <form
          className="grid sm:grid-cols-[1fr_180px_auto] gap-3 mb-8 bg-card border border-border rounded-xl p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            nav({
              search: {
                city: (fd.get("city") as string) || undefined,
                minRating: fd.get("minRating") ? Number(fd.get("minRating")) : undefined,
              },
            });
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" name="city" defaultValue={s.city ?? ""} placeholder="Ex: Joinville" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="minRating">Nota mínima</Label>
            <Input id="minRating" name="minRating" type="number" min={0} max={5} step={0.5} defaultValue={s.minRating ?? ""} />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">Buscar</Button>
          </div>
        </form>

        {q.isLoading && <div className="text-muted-foreground">Carregando…</div>}
        {!q.isLoading && !q.data?.length && (
          <div className="text-center py-16 text-muted-foreground">
            Nenhuma diarista encontrada. Tente ajustar os filtros.
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {q.data?.map((p) => (
            <Link key={p.id} to="/professionals/$id" params={{ id: p.id }} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-primary/10 text-primary grid place-items-center font-bold">
                  {(p.full_name ?? "?")[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{p.full_name ?? "Diarista"}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3" />{p.city ?? "—"}{p.state ? `, ${p.state}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm font-semibold">
                    <Star className="h-3.5 w-3.5 fill-accent text-accent" /> {Number(p.rating_avg ?? 0).toFixed(1)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{p.rating_count ?? 0} avaliações</div>
                </div>
              </div>
              {p.bio && <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{p.bio}</p>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
