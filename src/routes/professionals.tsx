import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Calendar } from "lucide-react";

const search = z.object({
  city: z.string().optional(),
  category: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
});

export const Route = createFileRoute("/professionals")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Diaristas verificadas — Gersepa Solutions" },
      { name: "description", content: "Busque diaristas por cidade, nota e disponibilidade." },
      { property: "og:title", content: "Diaristas — Gersepa Solutions" },
      { property: "og:description", content: "Encontre a diarista ideal na sua região." },
    ],
  }),
  component: ProfessionalsPage,
});

function ProfessionalsPage() {
  const s = Route.useSearch();
  const nav = Route.useNavigate();

  const q = useQuery({
    queryKey: ["pros", s.city ?? "", s.category ?? "", s.minRating ?? 0],
    queryFn: async () => {
      let qb = supabase
        .from("profiles")
        .select("id, full_name, city, bio, rating, total_reviews, profile_photo, profession_category")
        .eq("is_verified", true)
        .order("rating", { ascending: false })
        .limit(60);
      if (s.city) qb = qb.ilike("city", `%${s.city}%`);
      if (s.category) qb = qb.eq("profession_category", s.category);
      if (s.minRating) qb = qb.gte("rating", s.minRating);
      const { data, error } = await qb;
      if (error) throw error;
      return data ?? [];
    },
  });

  const cats = useQuery({
    queryKey: ["cats-filter"],
    queryFn: async () => (await supabase.from("profession_categories").select("slug, name").eq("is_enabled", true).order("display_order")).data ?? [],
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
          className="grid sm:grid-cols-[1fr_1fr_140px_auto] gap-3 mb-8 bg-card border border-border rounded-xl p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            nav({
              search: {
                city: (fd.get("city") as string) || undefined,
                category: (fd.get("category") as string) || undefined,
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
            <Label htmlFor="category">Categoria</Label>
            <select id="category" name="category" defaultValue={s.category ?? ""} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Todas</option>
              {cats.data?.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
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
                {p.profile_photo ? (
                  <img
                    src={p.profile_photo}
                    alt={p.full_name ?? "Diarista"}
                    loading="lazy"
                    className="h-14 w-14 rounded-full object-cover border border-border"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-primary/10 text-primary grid place-items-center font-bold">
                    {(p.full_name ?? "?")[0]}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{p.full_name ?? "Diarista"}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3" />{p.city ?? "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm font-semibold">
                    <Star className="h-3.5 w-3.5 fill-accent text-accent" /> {Number(p.rating ?? 0).toFixed(1)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{p.total_reviews ?? 0} avaliações</div>
                </div>
              </div>
              {p.bio && <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{p.bio}</p>}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link to="/professionals/$id" params={{ id: p.id }}>
                  <Button variant="outline" className="w-full">Ver Perfil</Button>
                </Link>
                <Link
                  to="/agendamento"
                  search={{ pro: p.id, city: "joinville", dur: 4, type: "residential", rooms: 2, baths: 1 }}
                >
                  <Button className="w-full gap-1"><Calendar className="h-3.5 w-3.5" /> Agendar</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
