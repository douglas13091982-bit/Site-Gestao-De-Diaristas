import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

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
  const navigate = useNavigate();
  const citiesQ = useQuery({
    queryKey: ["home", "cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("available_cities")
        .select("id, name, state, is_enabled")
        .eq("is_enabled", true)
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
        .eq("is_available", true)
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-secondary/40 text-foreground">
      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur bg-background/80 border-b border-primary/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-20">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">G</span>
            <span className="text-2xl font-bold tracking-tight text-primary">Gersepa</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#servicos" className="font-semibold text-muted-foreground hover:text-primary transition">Serviços</a>
            <a href="#como-funciona" className="font-semibold text-muted-foreground hover:text-primary transition">Como funciona</a>
            <Link to="/cities" className="font-semibold text-muted-foreground hover:text-primary transition">Cidades</Link>
            <Link to="/professionals" className="font-semibold text-muted-foreground hover:text-primary transition">Profissionais</Link>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link to="/dashboard"><Button size="sm" variant="outline">Meu painel</Button></Link>
                <Button size="sm" variant="ghost" onClick={() => signOut()}>Sair</Button>
              </>
            ) : (
              <>
                <Link to="/auth" className="hidden sm:block text-sm font-semibold text-muted-foreground hover:text-primary transition">Entrar</Link>
                <a
                  href="https://wa.me/5547991550354?text=Ol%C3%A1%2C%20gostaria%20de%20agendar%20uma%20faxina."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-[color:var(--brand-purple-deep)] transition"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03c0 2.12.553 4.189 1.601 6.006L0 24l6.117-1.605a11.803 11.803 0 005.925 1.586h.005c6.635 0 12.03-5.394 12.033-12.032.001-3.213-1.248-6.234-3.517-8.503"/></svg>
                  WhatsApp
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO — split */}
      <section className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Disponível em Santa Catarina
            </span>
            <h1 className="text-5xl lg:text-6xl font-extrabold text-primary leading-tight">
              Diaristas <span className="text-accent">verificadas</span> para sua casa ou empresa.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
              Conectamos você aos melhores profissionais de limpeza de SC. Atendimento personalizado, segurança garantida e praticidade para o seu dia a dia.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                "Profissionais com antecedentes verificados",
                "Treinamento especializado Gersepa",
                "Suporte humanizado via WhatsApp",
                "Avaliação 4.9/5 pelos clientes",
              ].map((t) => (
                <div key={t} className="flex items-start gap-3">
                  <div className="mt-1 p-1 rounded-full bg-accent/20">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span className="text-foreground/80 font-medium">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Booking card */}
          <div className="w-full max-w-lg">
            <QuoteCard onSubmit={() => navigate({ to: "/quick-booking" })} />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="py-20 border-t border-border bg-background">
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
      <section id="servicos" className="py-20 bg-secondary/40 border-y border-border">
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
      <section className="py-20 bg-background">
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
      <section id="depoimentos" className="py-20 bg-background">
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
      <footer className="border-t border-border py-10 bg-background">
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

      {/* Floating WhatsApp */}
      <a
        href="https://wa.me/5547991550354?text=Ol%C3%A1%2C%20gostaria%20de%20agendar%20uma%20faxina."
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale conosco no WhatsApp"
        className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-xl shadow-[#25d366]/40 hover:scale-105 transition"
      >
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03c0 2.12.553 4.189 1.601 6.006L0 24l6.117-1.605a11.803 11.803 0 005.925 1.586h.005c6.635 0 12.03-5.394 12.033-12.032.001-3.213-1.248-6.234-3.517-8.503"/></svg>
      </a>
    </div>
  );
}

function QuoteCard({ onSubmit }: { onSubmit: () => void }) {
  const [tab, setTab] = useState<"residencial" | "empresa">("residencial");
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white bg-card p-8 shadow-2xl shadow-primary/10">
      <div className="absolute top-0 left-0 h-2 w-full bg-gradient-to-r from-primary to-accent" />
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-primary">Solicite um orçamento</h2>
        <p className="text-sm text-muted-foreground mt-1">Rápido, fácil e sem compromisso</p>
      </div>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="flex p-1 rounded-xl bg-secondary">
          {(["residencial", "empresa"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all capitalize ${
                tab === t ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-primary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <Field label="Nome completo">
          <input type="text" placeholder="Como podemos te chamar?" className="w-full rounded-xl border border-border/60 bg-muted/40 px-4 py-3 outline-none transition-all focus:border-accent focus:bg-card focus:ring-2 focus:ring-accent/20" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="WhatsApp">
            <input type="tel" placeholder="(47) 99999-9999" className="w-full rounded-xl border border-border/60 bg-muted/40 px-4 py-3 outline-none transition-all focus:border-accent focus:bg-card focus:ring-2 focus:ring-accent/20" />
          </Field>
          <Field label="Cidade">
            <select className="w-full appearance-none cursor-pointer rounded-xl border border-border/60 bg-muted/40 px-4 py-3 outline-none transition-all focus:border-accent focus:bg-card focus:ring-2 focus:ring-accent/20">
              <option>Joinville</option>
              <option>Florianópolis</option>
              <option>Blumenau</option>
              <option>Itajaí</option>
            </select>
          </Field>
        </div>

        <Field label="Data desejada">
          <input type="date" className="w-full rounded-xl border border-border/60 bg-muted/40 px-4 py-3 outline-none transition-all focus:border-accent focus:bg-card focus:ring-2 focus:ring-accent/20" />
        </Field>

        <button
          type="submit"
          className="mt-2 w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:bg-[color:var(--brand-purple-deep)] hover:scale-[1.02] active:scale-[0.98]"
        >
          Receber cotação
        </button>
      </form>
      <p className="text-center text-[11px] text-muted-foreground mt-6">
        Seus dados estão protegidos de acordo com a LGPD.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-primary px-1">{label}</label>
      {children}
    </div>
  );
}