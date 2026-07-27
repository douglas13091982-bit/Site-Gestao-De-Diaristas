import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ProfessionalCard } from "@/components/ProfessionalCard";

const search = z.object({
  city: z.string().optional(),
  name: z.string().optional(),
  category: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
});

export const Route = createFileRoute("/professionals/")({
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
    queryKey: ["pros", s.city ?? "", s.name ?? "", s.category ?? "", s.minRating ?? 0],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_public_professionals", {
        _city_slug: s.city || null,
        _search: s.name || null,
        _category: s.category || null,
        _limit: 60,
      });
      if (error) throw error;
      const rows = data ?? [];
      return s.minRating ? rows.filter((r: { rating: number | null }) => (r.rating ?? 0) >= s.minRating!) : rows;
    },
  });

  const cats = useQuery({
    queryKey: ["cats-filter"],
    queryFn: async () => (await supabase.from("profession_categories").select("slug, name").eq("is_enabled", true).order("display_order")).data ?? [],
  });

  const cities = useQuery({
    queryKey: ["cities-filter"],
    queryFn: async () => (await supabase.from("available_cities").select("slug, name, state").eq("is_enabled", true).order("display_order")).data ?? [],
  });

  return (
    <div className="min-h-screen bg-secondary/40 overflow-x-hidden">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Diaristas verificadas</h1>
          <p className="text-muted-foreground">Filtre por nome, cidade, categoria e avaliação.</p>
        </div>

        <form
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_180px_auto] gap-3 mb-8 bg-card border border-border rounded-xl p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            nav({
              search: {
                city: (fd.get("city") as string) || undefined,
                name: (fd.get("name") as string) || undefined,
                category: (fd.get("category") as string) || undefined,
                minRating: fd.get("minRating") ? Number(fd.get("minRating")) : undefined,
              },
            });
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="name">Nome da diarista</Label>
            <Input id="name" name="name" defaultValue={s.name ?? ""} placeholder="Digite o nome" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="city">Cidade</Label>
            <select id="city" name="city" defaultValue={s.city ?? ""} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Todas as cidades</option>
              {cities.data?.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}{c.state ? ` - ${c.state}` : ""}</option>
              ))}
            </select>
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
            <select id="minRating" name="minRating" defaultValue={s.minRating ? String(s.minRating) : ""} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Qualquer nota</option>
              <option value="5">5 estrelas</option>
              <option value="4.5">4,5+</option>
              <option value="4">4+</option>
              <option value="3.5">3,5+</option>
              <option value="3">3+</option>
            </select>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {q.data?.map((p) => <ProfessionalCard key={p.id} p={p} />)}
        </div>
      </div>
    </div>
  );
}
