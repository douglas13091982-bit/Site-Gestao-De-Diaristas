import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Search, ShieldCheck, Calendar, Star, MapPin, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BabyClean — Diaristas verificadas na sua região" },
      { name: "description", content: "Encontre diaristas profissionais, agende horários e pague com segurança pelo BabyClean." },
      { property: "og:title", content: "BabyClean — Diaristas verificadas" },
      { property: "og:description", content: "Marketplace seguro para conectar clientes e diaristas. Agende em minutos." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const featured = useQuery({
    queryKey: ["featured-pros"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, city, state, rating_avg, rating_count, bio")
        .eq("is_verified", true)
        .order("rating_avg", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1.5 text-xs font-semibold text-primary border border-primary/20">
              <ShieldCheck className="h-3.5 w-3.5" /> Profissionais verificadas
            </span>
            <h1 className="text-4xl lg:text-6xl font-extrabold leading-tight text-foreground">
              Sua casa <span className="text-primary">limpa</span> e você <span className="text-accent">tranquilo</span>.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Encontre diaristas próximas, veja avaliações reais e agende em minutos.
              Pagamento seguro e proteção BabyClean em todos os serviços.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/professionals">
                <Button size="lg" className="gap-2"><Search className="h-4 w-4" /> Encontrar diarista</Button>
              </Link>
              <Link to="/auth" search={{ mode: "signup", role: "worker" } as never}>
                <Button size="lg" variant="outline">Cadastrar como diarista</Button>
              </Link>
            </div>
            <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" /> Verificação de identidade</div>
              <div className="flex items-center gap-2"><Star className="h-4 w-4 text-accent" /> Avaliações reais</div>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square rounded-3xl bg-white/60 backdrop-blur border border-white/60 shadow-2xl p-8 grid grid-cols-2 gap-4">
              {[
                { icon: Search, title: "Busque", text: "Encontre por região e disponibilidade" },
                { icon: Calendar, title: "Agende", text: "Escolha o melhor horário" },
                { icon: ShieldCheck, title: "Pague", text: "Seguro via BabyClean" },
                { icon: Star, title: "Avalie", text: "Comunidade transparente" },
              ].map((s) => (
                <div key={s.title} className="rounded-2xl bg-white p-5 shadow-sm border border-border">
                  <s.icon className="h-8 w-8 text-primary mb-3" />
                  <div className="font-bold">{s.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold">Como funciona</h2>
            <p className="text-muted-foreground mt-2">Simples, rápido e seguro.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { n: 1, t: "Busque", d: "Filtre por cidade, preço e nota." },
              { n: 2, t: "Escolha", d: "Veja perfil, agenda e avaliações." },
              { n: 3, t: "Agende", d: "Confirme data, horário e endereço." },
              { n: 4, t: "Avalie", d: "Deixe sua nota após o serviço." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-border p-6 hover:shadow-md transition">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold mb-4">{s.n}</div>
                <div className="font-bold text-lg">{s.t}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="py-20 bg-secondary/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">Profissionais em destaque</h2>
              <p className="text-muted-foreground mt-1">As diaristas melhor avaliadas da plataforma.</p>
            </div>
            <Link to="/professionals" className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1">
              Ver todas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.data?.length ? featured.data.map((p) => (
              <Link key={p.id} to="/professionals/$id" params={{ id: p.id }} className="rounded-2xl bg-card border border-border p-5 hover:shadow-md transition">
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
                    <div className="flex items-center gap-1 text-sm font-semibold"><Star className="h-3.5 w-3.5 fill-accent text-accent" /> {Number(p.rating_avg ?? 0).toFixed(1)}</div>
                    <div className="text-[10px] text-muted-foreground">{p.rating_count ?? 0} avaliações</div>
                  </div>
                </div>
                {p.bio && <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{p.bio}</p>}
              </Link>
            )) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Nenhuma diarista cadastrada ainda. <Link to="/auth" search={{ mode: "signup", role: "worker" } as never} className="text-primary font-semibold">Seja a primeira</Link>.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-bold">Você é diarista?</h2>
          <p className="text-lg text-primary-foreground/85 max-w-xl mx-auto">
            Cadastre-se grátis, monte sua agenda e receba solicitações de clientes da sua região.
          </p>
          <Link to="/auth" search={{ mode: "signup", role: "worker" } as never}>
            <Button size="lg" variant="secondary">Cadastrar como diarista</Button>
          </Link>
        </div>
      </section>

      <footer className="py-10 border-t border-border text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} BabyClean — Marketplace de diaristas verificadas.
      </footer>
    </div>
  );
}
