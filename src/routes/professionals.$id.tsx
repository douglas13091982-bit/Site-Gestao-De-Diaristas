import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Star, MapPin, ShieldCheck, Clock } from "lucide-react";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const Route = createFileRoute("/professionals/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Diarista ${params.id} — Gersepa Solutions` },
      { name: "description", content: "Perfil, serviços e agenda da diarista no Gersepa Solutions." },
      { property: "og:title", content: "Perfil da diarista — Gersepa Solutions" },
      { property: "og:description", content: "Veja avaliações, serviços e agende diretamente." },
    ],
  }),
  component: ProfessionalPage,
});

function ProfessionalPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const profile = useQuery({
    queryKey: ["pro", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles")
        .select("id, full_name, profile_photo, bio, city, rating, total_reviews, is_verified")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const services = useQuery({
    queryKey: ["pricing"],
    queryFn: async () => (await supabase.from("pricing_packages").select("*").eq("is_enabled", true).order("display_order")).data ?? [],
  });
  const availability = useQuery({
    queryKey: ["pro-avail", id],
    queryFn: async () => (await supabase.from("professional_availability").select("*").eq("professional_id", id).eq("is_available", true).order("day_of_week")).data ?? [],
  });
  const reviews = useQuery({
    queryKey: ["pro-reviews", id],
    queryFn: async () => (await supabase.from("reviews").select("*").eq("professional_id", id).order("created_at", { ascending: false }).limit(20)).data ?? [],
  });

  const p = profile.data;

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {profile.isLoading && <div className="text-muted-foreground">Carregando…</div>}
        {!profile.isLoading && !p && (
          <div className="text-center py-16">
            Perfil não encontrado. <Link to="/professionals" className="text-primary font-semibold">Voltar</Link>
          </div>
        )}
        {p && (
          <>
            <div className="bg-card border border-border rounded-2xl p-8 flex flex-col md:flex-row gap-6 items-start">
              {p.profile_photo ? (
                <img
                  src={p.profile_photo}
                  alt={p.full_name ?? "Diarista"}
                  className="h-24 w-24 rounded-2xl object-cover border border-border"
                />
              ) : (
                <div className="h-24 w-24 rounded-2xl bg-primary/10 text-primary grid place-items-center text-3xl font-bold">
                  {(p.full_name ?? "?")[0]}
                </div>
              )}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold">{p.full_name ?? "Diarista"}</h1>
                  {p.is_verified && <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent"><ShieldCheck className="h-3 w-3" /> Verificada</span>}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" />{p.city ?? "—"}</div>
                <div className="flex items-center gap-2 text-sm"><Star className="h-4 w-4 fill-accent text-accent" /> <b>{Number(p.rating ?? 0).toFixed(1)}</b> <span className="text-muted-foreground">({p.total_reviews ?? 0} avaliações)</span></div>
                {p.bio && <p className="text-muted-foreground">{p.bio}</p>}
              </div>
              <Button size="lg" onClick={() => nav({
                to: "/agendamento",
                search: { pro: id, city: p.city_slug ?? "", dur: 4, type: "residential", rooms: 2, baths: 1 },
              })}>
                Agendar
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-bold mb-4">Serviços</h2>
                {services.data?.length ? (
                  <ul className="space-y-3">
                    {services.data.map((s) => (
                      <li key={s.id} className="flex justify-between border-b border-border pb-3 last:border-0">
                        <div>
                          <div className="font-semibold">Pacote {s.duration_hours}h</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock className="h-3 w-3" /> {s.duration_hours}h · início {s.start_time}</div>
                        </div>
                        <div className="font-bold text-primary">R$ {Number(s.price).toFixed(2)}</div>
                      </li>
                    ))}
                  </ul>
                ) : <div className="text-sm text-muted-foreground">Ainda sem serviços cadastrados.</div>}
              </div>

              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-bold mb-4">Agenda</h2>
                {availability.data?.length ? (
                  <ul className="space-y-1 text-sm">
                    {availability.data.map((a) => (
                      <li key={a.id} className="flex justify-between">
                        <span className="font-semibold">{DAYS[a.day_of_week]}</span>
                        <span className="text-muted-foreground">{a.start_time.slice(0,5)} — {a.end_time.slice(0,5)}</span>
                      </li>
                    ))}
                  </ul>
                ) : <div className="text-sm text-muted-foreground">Sem horários publicados.</div>}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-bold mb-4">Avaliações</h2>
              {reviews.data?.length ? (
                <ul className="space-y-4">
                  {reviews.data.map((r) => (
                    <li key={r.id} className="border-b border-border pb-3 last:border-0">
                      <div className="flex items-center gap-2 text-sm">
                        {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-accent text-accent" />)}
                      </div>
                      {r.comment && <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              ) : <div className="text-sm text-muted-foreground">Ainda sem avaliações.</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
