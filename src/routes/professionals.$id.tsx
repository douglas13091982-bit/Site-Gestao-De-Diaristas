import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Star, MapPin, ShieldCheck, Calendar, MessageCircle, Phone, ArrowLeft, Sparkles, Award } from "lucide-react";

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
  const nav = useNavigate();

  const profile = useQuery({
    queryKey: ["pro", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_professional", { _id: id });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
  const reviews = useQuery({
    queryKey: ["pro-reviews", id],
    queryFn: async () => {
      const res = await (supabase as any).from("public_reviews").select("*").eq("professional_id", id).order("created_at", { ascending: false }).limit(20);
      return (res.data ?? []) as Array<{ id: number; rating: number; comment: string | null; created_at: string; professional_id: string; booking_id: number | null }>;
    },
  });

  const p = profile.data;
  const firstName = (p?.full_name ?? "").split(" ")[0] || "Diarista";
  const specialties: string[] = Array.isArray(p?.specialties) ? (p!.specialties as string[]) : [];
  const regions: string[] = Array.isArray(p?.regions) ? (p!.regions as string[]) : [];
  const totalReviews = p?.total_reviews ?? 0;
  const rating = Number(p?.rating ?? 0);
  const dist = [5, 4, 3, 2, 1].map((star) => {
    const count = (reviews.data ?? []).filter((r) => r.rating === star).length;
    return { star, pct: totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0 };
  });

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <Link to="/professionals" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        {profile.isLoading && <div className="text-muted-foreground">Carregando…</div>}
        {!profile.isLoading && !p && (
          <div className="text-center py-16">
            Perfil não encontrado. <Link to="/professionals" className="text-primary font-semibold">Voltar</Link>
          </div>
        )}
        {p && (
          <>
            {/* Hero card */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="relative">
                  {p.profile_photo ? (
                    <img
                      src={p.profile_photo}
                      alt={p.full_name ?? "Diarista"}
                      className="h-28 w-28 rounded-2xl object-cover border border-border"
                    />
                  ) : (
                    <div className="h-28 w-28 rounded-2xl bg-primary/10 text-primary grid place-items-center text-3xl font-bold">
                      {(p.full_name ?? "?")[0]}
                    </div>
                  )}
                  {p.is_verified && (
                    <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-accent text-white grid place-items-center shadow">
                      <Award className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-3xl font-bold">{p.full_name ?? "Diarista"}</h1>
                    {p.is_verified && <ShieldCheck className="h-6 w-6 text-accent" />}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{p.city ?? "—"}</span>
                    {p.experience && <span>· {p.experience}</span>}
                    <span>· {p.total_bookings ?? 0}+ limpezas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-5 w-5 ${i < Math.round(rating) ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
                    ))}
                    <b className="text-lg">{rating.toFixed(1)}</b>
                    <span className="text-muted-foreground text-sm">({totalReviews} avaliações)</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-border mt-6 pt-6 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
                <Button
                  size="lg"
                  className="gap-2"
                  onClick={() => nav({
                    to: "/agendamento",
                    search: { pro: id, city: p.city_slug ?? "", dur: 4, type: "residential", rooms: 2, baths: 1 },
                  })}
                >
                  <Calendar className="h-4 w-4" /> Agendar com {firstName}
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <MessageCircle className="h-4 w-4" /> Mensagem
                </Button>
                <Button size="lg" variant="outline" className="gap-2" disabled>
                  <Phone className="h-4 w-4" /> Ligar após reservar
                </Button>
              </div>
            </div>

            {/* Sobre mim */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-bold text-xl mb-3">Sobre mim</h2>
              <p className="text-muted-foreground">
                {p.bio || "Profissional dedicada e comprometida com a qualidade do serviço."}
              </p>
            </div>

            {/* Especialidades + Regiões */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-bold text-xl mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Especialidades
                </h2>
                {specialties.length ? (
                  <div className="flex flex-wrap gap-2">
                    {specialties.map((s, i) => (
                      <span key={i} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary">{s}</span>
                    ))}
                  </div>
                ) : <div className="text-sm text-muted-foreground">Sem especialidades cadastradas.</div>}
              </div>
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-bold text-xl mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" /> Regiões atendidas
                </h2>
                {regions.length ? (
                  <div className="flex flex-wrap gap-2">
                    {regions.map((r, i) => (
                      <span key={i} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-accent/10 text-accent">{r}</span>
                    ))}
                  </div>
                ) : <div className="text-sm text-muted-foreground">Sem regiões cadastradas.</div>}
              </div>
            </div>

            {/* Avaliações */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-xl">Avaliações</h2>
                <span className="text-sm text-muted-foreground">{totalReviews} avaliações</span>
              </div>
              <div className="grid md:grid-cols-[auto_1fr] gap-8 mb-6">
                <div className="text-center">
                  <div className="text-5xl font-bold">{rating.toFixed(1)}</div>
                  <div className="flex justify-center gap-0.5 my-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < Math.round(rating) ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">Baseado em {totalReviews} avaliações</div>
                </div>
                <div className="space-y-2">
                  {dist.map((d) => (
                    <div key={d.star} className="flex items-center gap-3 text-sm">
                      <span className="w-4">{d.star}</span>
                      <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${d.pct}%` }} />
                      </div>
                      <span className="w-10 text-right text-muted-foreground">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
              {reviews.data?.length ? (
                <ul className="space-y-4 border-t border-border pt-4">
                  {reviews.data.map((r) => (
                    <li key={r.id} className="border-b border-border pb-3 last:border-0">
                      <div className="flex items-center gap-2 text-sm">
                        {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-accent text-accent" />)}
                      </div>
                      {r.comment && <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-6 border-t border-border">
                  Esta profissional ainda não possui avaliações.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
