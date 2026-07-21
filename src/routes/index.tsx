import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-clean-home.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gersepa — Diaristas verificadas em Santa Catarina" },
      { name: "description", content: "Agende diaristas profissionais em Joinville, Florianópolis, Blumenau e outras cidades de SC. Avaliações reais, pagamento seguro e confirmação em minutos." },
      { property: "og:title", content: "Gersepa — Diaristas verificadas em Santa Catarina" },
      { property: "og:description", content: "Agende diaristas profissionais em SC. Avaliações reais, pagamento seguro e confirmação em minutos." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user, signOut } = useAuth();
  const citiesQ = useQuery({
    queryKey: ["home", "cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("available_cities")
        .select("id, name, state, active")
        .eq("active", true)
        .order("name")
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });
  const prosQ = useQuery({
    queryKey: ["home", "professionals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name, city, rating, specialties, hourly_rate")
        .eq("is_active", true)
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-40 backdrop-blur bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">G</span>
            <span className="text-lg font-bold tracking-tight">Gersepa</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#como-funciona" className="text-muted-foreground hover:text-foreground transition">Como funciona</a>
            <Link to="/professionals" className="text-muted-foreground hover:text-foreground transition">Profissionais</Link>
            <Link to="/cities" className="text-muted-foreground hover:text-foreground transition">Cidades</Link>
            <a href="#depoimentos" className="text-muted-foreground hover:text-foreground transition">Depoimentos</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link to="/dashboard"><Button size="sm" variant="outline">Meu painel</Button></Link>
                <Button size="sm" variant="ghost" onClick={() => signOut()}>Sair</Button>
              </>
            ) : (
              <>
                <Link to="/auth" className="hidden sm:block"><Button size="sm" variant="ghost">Entrar</Button></Link>
                <Link to="/quick-booking"><Button size="sm">Agendar</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-secondary text-secondary-foreground border border-border">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Atendemos toda Santa Catarina
            </span>
            <h1 className="text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight">
              Sua casa impecável com <span className="text-primary">diaristas verificadas</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg">
              Agende profissionais qualificadas em minutos. Avaliações reais, preço transparente e pagamento seguro pelo app.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/quick-booking"><Button size="lg" className="text-base">Fazer agendamento</Button></Link>
              <Link to="/professionals"><Button size="lg" variant="outline" className="text-base">Ver profissionais</Button></Link>
            </div>
            <div className="flex items-center gap-8 pt-6 text-sm">
              <div>
                <div className="text-2xl font-bold text-foreground">4.9★</div>
                <div className="text-muted-foreground">Avaliação média</div>
              </div>
              <div className="h-10 w-px bg-border" />
              <div>
                <div className="text-2xl font-bold text-foreground">+2.000</div>
                <div className="text-muted-foreground">Faxinas realizadas</div>
              </div>
              <div className="h-10 w-px bg-border" />
              <div>
                <div className="text-2xl font-bold text-foreground">15+</div>
                <div className="text-muted-foreground">Cidades atendidas</div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-[var(--shadow-elevated)] border border-border">
              <img src={heroImg} alt="Sala impecável após limpeza profissional" className="w-full h-full object-cover" width={1600} height={1200} />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden md:block bg-card border border-border rounded-2xl shadow-[var(--shadow-card)] p-4 w-64">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">✓</div>
                <div>
                  <div className="text-sm font-semibold">Confirmado</div>
                  <div className="text-xs text-muted-foreground">Ana chega em 15 min</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="py-20 border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold">Simples como deve ser</h2>
            <p className="text-muted-foreground mt-3">Do agendamento à casa limpa em 3 passos.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "01", t: "Escolha o serviço", d: "Diária, semanal ou faxina pesada. Você decide a duração e o pacote." },
              { n: "02", t: "Escolha o profissional", d: "Veja perfil, avaliações e especialidades. Reserve com um clique." },
              { n: "03", t: "Relaxe", d: "A profissional chega no horário. Pague pelo app com total segurança." },
            ].map((s) => (
              <div key={s.n} className="p-6 rounded-2xl bg-card border border-border shadow-[var(--shadow-card)]">
                <div className="text-sm font-mono text-primary mb-3">{s.n}</div>
                <div className="text-xl font-semibold mb-2">{s.t}</div>
                <div className="text-muted-foreground text-sm">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 bg-secondary/40 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-6">
          {[
            { i: "🛡️", t: "Verificadas", d: "Documentação e antecedentes conferidos." },
            { i: "⭐", t: "Avaliações reais", d: "Feedback de clientes verdadeiros após cada serviço." },
            { i: "💳", t: "Pagamento seguro", d: "Cartão ou Pix, direto pelo app com garantia." },
            { i: "📅", t: "Agenda flexível", d: "Escolha data, horário e reagende quando precisar." },
          ].map((f) => (
            <div key={f.t} className="text-center">
              <div className="text-3xl mb-2">{f.i}</div>
              <div className="font-semibold mb-1">{f.t}</div>
              <div className="text-sm text-muted-foreground">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PROFESSIONALS PREVIEW */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold">Profissionais em destaque</h2>
              <p className="text-muted-foreground mt-2">As diaristas mais bem avaliadas da plataforma.</p>
            </div>
            <Link to="/professionals" className="text-sm font-medium text-primary hover:underline hidden sm:block">Ver todas →</Link>
          </div>
          {prosQ.isLoading ? (
            <div className="grid md:grid-cols-4 gap-4">
              {[0,1,2,3].map((i) => <div key={i} className="h-56 rounded-2xl bg-muted animate-pulse" />)}
            </div>
          ) : prosQ.data && prosQ.data.length > 0 ? (
            <div className="grid md:grid-cols-4 gap-4">
              {prosQ.data.map((p) => (
                <Link key={p.id} to="/professionals" className="p-5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-[var(--shadow-card)] transition">
                  <div className="h-14 w-14 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xl font-bold mb-3">
                    {p.name?.charAt(0) ?? "?"}
                  </div>
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground mb-2">{p.city}</div>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-accent">★</span>
                    <span className="font-medium">{p.rating ? Number(p.rating).toFixed(1) : "—"}</span>
                  </div>
                  {p.hourly_rate && (
                    <div className="text-xs text-muted-foreground mt-1">a partir de R$ {Number(p.hourly_rate).toFixed(0)}/h</div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">Novos profissionais em breve.</div>
          )}
        </div>
      </section>

      {/* CITIES */}
      <section className="py-20 bg-secondary/40 border-y border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold">Cidades atendidas</h2>
              <p className="text-muted-foreground mt-2">Estamos crescendo por toda Santa Catarina.</p>
            </div>
            <Link to="/cities" className="text-sm font-medium text-primary hover:underline hidden sm:block">Ver todas →</Link>
          </div>
          {citiesQ.data && citiesQ.data.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {citiesQ.data.map((c) => (
                <Link key={c.id} to="/professionals" search={{ city: c.name } as never} className="p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition">
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.state}</div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">Carregando cidades...</div>
          )}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="depoimentos" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold">Clientes felizes, casas impecáveis</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "Marina S.", c: "Florianópolis", t: "A diarista chegou pontual e deixou meu apartamento brilhando. Agendei mais 3 semanas!" },
              { n: "Rafael T.", c: "Joinville", t: "Processo super fácil. Paguei pelo app, avaliei em 30 segundos. Recomendo demais." },
              { n: "Camila P.", c: "Blumenau", t: "Encontrei uma profissional incrível pertinho de casa. Serviço impecável." },
            ].map((r) => (
              <div key={r.n} className="p-6 rounded-2xl bg-card border border-border">
                <div className="text-accent mb-3">★★★★★</div>
                <p className="text-sm text-foreground/90 leading-relaxed">"{r.t}"</p>
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="font-semibold text-sm">{r.n}</div>
                  <div className="text-xs text-muted-foreground">{r.c}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — PROFESSIONALS */}
      <section className="py-20 bg-secondary/40 border-t border-border">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="text-xs font-semibold tracking-widest text-primary uppercase">Para diaristas</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3">Aumente sua renda com a Gersepa</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Cadastre-se grátis, defina sua agenda e receba pedidos de clientes verificados na sua cidade.</p>
          <div className="mt-6">
            <Link to="/auth"><Button size="lg">Quero me cadastrar</Button></Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">G</span>
            <span className="font-semibold text-foreground">Gersepa Solutions</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/cities" className="hover:text-foreground">Cidades</Link>
            <Link to="/professionals" className="hover:text-foreground">Profissionais</Link>
            <Link to="/auth" className="hover:text-foreground">Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}