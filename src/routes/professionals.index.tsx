import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Search, SlidersHorizontal, X, MapPin } from "lucide-react";
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
  sort: z.string().optional(),
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
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = useQuery({
    queryKey: ["pros", s.city ?? "", s.name ?? "", s.category ?? "", s.minRating ?? 0, s.sort ?? "best"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_public_professionals", {
        _city_slug: s.city || null,
        _search: s.name || null,
        _category: s.category || null,
        _limit: 60,
      });
      if (error) throw error;
      let rows = data ?? [];
      if (s.minRating) rows = rows.filter((r: { rating: number | null }) => (r.rating ?? 0) >= s.minRating!);
      if (s.sort === "reviews") rows = [...rows].sort((a, b) => (b.total_reviews ?? 0) - (a.total_reviews ?? 0));
      else if (s.sort === "bookings") rows = [...rows].sort((a, b) => (b.total_bookings ?? 0) - (a.total_bookings ?? 0));
      return rows;
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

  const activeCount =
    (s.city ? 1 : 0) + (s.category ? 1 : 0) + (s.minRating ? 1 : 0);
  const cityName = cities.data?.find((c) => c.slug === s.city)?.name;
  const catName = cats.data?.find((c) => c.slug === s.category)?.name;

  const clearAll = () => nav({ search: { name: s.name || undefined } });

  return (
    <div className="min-h-screen bg-secondary/40 overflow-x-hidden">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Search bar + Filters button */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Buscar profissional"
              defaultValue={s.name ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                clearTimeout((window as unknown as { __proSearchT?: number }).__proSearchT);
                (window as unknown as { __proSearchT?: number }).__proSearchT = window.setTimeout(() => {
                  nav({ search: (prev: typeof s) => ({ ...prev, name: value || undefined }) });
                }, 300);
              }}
              className="pl-10 h-12 rounded-xl bg-card shadow-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="relative flex items-center gap-2 h-12 px-5 rounded-xl bg-card border border-border shadow-sm hover:bg-accent transition-colors"
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span className="font-medium">Filtros</span>
            {activeCount > 0 && (
              <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {/* Count + sort */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-sm sm:text-base">
            <span className="font-bold text-xl sm:text-2xl">{q.data?.length ?? 0}</span>{" "}
            <span className="text-muted-foreground">profissionais encontrados</span>
          </div>
          <select
            value={s.sort ?? "best"}
            onChange={(e) => nav({ search: (prev: typeof s) => ({ ...prev, sort: e.target.value === "best" ? undefined : e.target.value }) })}
            className="h-10 rounded-full border border-border bg-card px-4 text-sm font-medium shadow-sm"
          >
            <option value="best">Melhor avaliados</option>
            <option value="reviews">Mais avaliações</option>
            <option value="bookings">Mais serviços</option>
          </select>
        </div>

        {/* Active filter chips */}
        {activeCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {cityName && (
              <button
                onClick={() => nav({ search: (prev: typeof s) => ({ ...prev, city: undefined }) })}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15"
              >
                <MapPin className="h-3.5 w-3.5" />
                {cityName}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {catName && (
              <button
                onClick={() => nav({ search: (prev: typeof s) => ({ ...prev, category: undefined }) })}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15"
              >
                {catName}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {s.minRating && (
              <button
                onClick={() => nav({ search: (prev: typeof s) => ({ ...prev, minRating: undefined }) })}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15"
              >
                {s.minRating}+ estrelas
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

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

      {/* Filters modal/drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 animate-in fade-in"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="relative w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-5 border-b border-border bg-card">
              <h2 className="text-lg font-bold">Filtros</h2>
              <button
                onClick={() => setFiltersOpen(false)}
                className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              className="p-5 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                nav({
                  search: (prev: typeof s) => ({
                    ...prev,
                    city: (fd.get("city") as string) || undefined,
                    category: (fd.get("category") as string) || undefined,
                    minRating: fd.get("minRating") ? Number(fd.get("minRating")) : undefined,
                  }),
                });
                setFiltersOpen(false);
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="f-city">Cidade</Label>
                <select id="f-city" name="city" defaultValue={s.city ?? ""} className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Todas as cidades</option>
                  {cities.data?.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}{c.state ? ` - ${c.state}` : ""}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="f-cat">Categoria</Label>
                <select id="f-cat" name="category" defaultValue={s.category ?? ""} className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Todas</option>
                  {cats.data?.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Nota mínima</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { v: "", l: "Todas" },
                    { v: "3", l: "3+" },
                    { v: "4", l: "4+" },
                    { v: "4.5", l: "4,5+" },
                    { v: "5", l: "5" },
                  ].map((opt) => (
                    <label key={opt.v} className="cursor-pointer">
                      <input
                        type="radio"
                        name="minRating"
                        value={opt.v}
                        defaultChecked={(s.minRating ? String(s.minRating) : "") === opt.v}
                        className="peer sr-only"
                      />
                      <div className="h-11 flex items-center justify-center rounded-lg border border-input bg-background text-sm font-medium peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:border-primary transition-colors">
                        {opt.l}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { clearAll(); setFiltersOpen(false); }}>
                  Limpar tudo
                </Button>
                <Button type="submit" className="flex-1">Aplicar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
