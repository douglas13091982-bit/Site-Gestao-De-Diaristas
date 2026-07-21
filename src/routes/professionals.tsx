import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const searchSchema = z.object({
  city: fallback(z.string(), "").default(""),
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/professionals")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Profissionais — Gersepa Solutions" },
      { name: "description", content: "Encontre diaristas e profissionais verificados em Santa Catarina." },
      { property: "og:title", content: "Profissionais — Gersepa Solutions" },
      { property: "og:description", content: "Diaristas verificados em Santa Catarina." },
    ],
  }),
  component: ProfessionalsPage,
});

function ProfessionalsPage() {
  const { city, q } = Route.useSearch();
  const navigate = Route.useNavigate();

  const listQ = useQuery({
    queryKey: ["professionals-public", city],
    queryFn: async () => {
      let req = supabase
        .from("professionals")
        .select("id, name, city, bio, photo_url, hourly_rate, rating, total_reviews, is_verified, profession_category, specialties")
        .eq("is_available", true)
        .order("rating", { ascending: false })
        .limit(60);
      if (city) req = req.eq("city", city);
      const { data, error } = await req;
      if (error) throw error;
      return data ?? [];
    },
  });

  const citiesQ = useQuery({
    queryKey: ["cities-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("available_cities")
        .select("name")
        .eq("is_enabled", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (listQ.data ?? []).filter((p) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    return (
      (p.name ?? "").toLowerCase().includes(needle) ||
      (p.specialties ?? "").toLowerCase().includes(needle) ||
      (p.profession_category ?? "").toLowerCase().includes(needle)
    );
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold">Gersepa</Link>
          <Link to="/quick-booking"><Button size="sm">Agendar</Button></Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <h1 className="text-3xl font-bold">Profissionais disponíveis</h1>

        <div className="grid gap-3 sm:grid-cols-2 rounded-md border border-border p-4">
          <div className="space-y-1">
            <Label htmlFor="f-city">Cidade</Label>
            <select
              id="f-city"
              value={city}
              onChange={(e) => navigate({ search: (p) => ({ ...p, city: e.target.value }) })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {(citiesQ.data ?? []).map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-q">Buscar</Label>
            <Input
              id="f-q"
              placeholder="Nome, especialidade..."
              value={q}
              onChange={(e) => navigate({ search: (p) => ({ ...p, q: e.target.value }) })}
            />
          </div>
        </div>

        {listQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando profissionais...</p>
        ) : listQ.error ? (
          <p className="text-sm text-destructive">Erro: {(listQ.error as Error).message}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum profissional encontrado.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <li key={p.id} className="rounded-md border border-border p-4 space-y-2">
                <div className="flex items-center gap-3">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.name ?? ""} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted" />
                  )}
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.city ?? "—"}</p>
                  </div>
                </div>
                {p.bio ? <p className="text-sm text-muted-foreground line-clamp-2">{p.bio}</p> : null}
                <div className="flex items-center justify-between text-xs">
                  <span>⭐ {p.rating != null ? Number(p.rating).toFixed(1) : "—"} ({p.total_reviews ?? 0})</span>
                  <span className="font-medium">R$ {Number(p.hourly_rate ?? 0).toFixed(0)}/h</span>
                </div>
                {p.is_verified ? (
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary">Verificado</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}