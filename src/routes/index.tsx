import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, Star, MapPin, ArrowRight, Zap, Users, Home, Building2,
  Store, Building, Calendar, Target, MessageCircle, CheckCircle2, Clock,
  Wallet, HeartHandshake, BadgeCheck,
} from "lucide-react";

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
  const city = "Joinville";
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

      {/* HERO — split with quote card */}
      <HeroSection city={city} />

      {/* Melhores diaristas */}
      <FeaturedSection city={city} pros={featured.data ?? []} />

      {/* Por que escolher */}
      <WhySection />

      {/* Seja diarista */}
      <BeWorkerSection />

      {/* Footer */}
      <FooterSection />

      {/* WhatsApp float */}
      <a
        href="https://wa.me/5547999999999"
        target="_blank"
        rel="noreferrer"
        aria-label="Fale conosco no WhatsApp"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-accent text-white grid place-items-center shadow-xl hover:scale-105 transition"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </div>
  );
}

/* ————————————————— HERO ————————————————— */
function HeroSection({ city }: { city: string }) {
  const [mode, setMode] = useState<"fast" | "choose">("fast");
  const [propertyType, setPropertyType] = useState<"casa" | "apto" | "com" | "cond">("casa");

  const propertyOptions = [
    { id: "casa", label: "Casa", icon: Home },
    { id: "apto", label: "Apartamento", icon: Building2 },
    { id: "com", label: "Comercial", icon: Store },
    { id: "cond", label: "Condomínio", icon: Building },
  ] as const;

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-70 pointer-events-none"
        style={{ backgroundImage: "var(--dot-pattern)", backgroundSize: "22px 22px" }}
      />
      <div className="relative max-w-7xl mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-10 items-start">
        {/* Left */}
        <div className="space-y-6 pt-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur px-3 py-1.5 text-xs font-semibold text-accent border border-accent/20">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Disponível em 46 cidades
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight text-foreground">
            Sua Casa Limpa e Organizada em{" "}
            <span className="relative inline-block">
              <span style={{ color: "var(--highlight)" }}>{city}</span>
              <svg
                aria-hidden
                viewBox="0 0 200 12"
                preserveAspectRatio="none"
                className="absolute -bottom-2 left-0 w-full h-3"
              >
                <path
                  d="M2 8 C 50 2, 150 2, 198 8"
                  fill="none"
                  stroke="var(--highlight)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl">
            Encontre profissionais de limpeza qualificados perto de você.
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-foreground/80">
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> Profissionais verificadas</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> Pagamento seguro</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> Garantia de satisfação</span>
          </div>

          {/* Google reviews strip */}
          <div className="mt-6 rounded-2xl border border-primary/15 bg-white/70 backdrop-blur px-5 py-3 max-w-md">
            <div className="flex items-center justify-center gap-1 text-highlight">
              {[0, 1, 2, 3].map((i) => (
                <Star key={i} className="h-4 w-4 fill-current" style={{ color: "var(--highlight)" }} />
              ))}
              <Star className="h-4 w-4" style={{ color: "var(--highlight)" }} />
            </div>
            <div className="text-center text-sm mt-1">
              <span className="font-bold text-primary">4.5</span>
              <span className="text-muted-foreground"> de 505 avaliações em {city}</span>
            </div>
            <div className="text-center text-xs text-muted-foreground mt-1">Google Reviews</div>
          </div>
        </div>

        {/* Right — Quote card */}
        <div className="lg:sticky lg:top-24">
          <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-[var(--shadow-elevated)]">
            <div className="px-6 py-5 text-white" style={{ background: "var(--gradient-quote)" }}>
              <div className="font-bold text-lg">Agende seu Serviço</div>
              <div className="text-white/85 text-sm">Em {city}</div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <div className="text-sm font-semibold mb-2">Como deseja agendar?</div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setMode("fast")}
                    className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                      mode === "fast" ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border hover:border-accent/40"
                    }`}
                  >
                    <span className="h-9 w-9 rounded-lg grid place-items-center bg-accent/10 text-accent">
                      <Zap className="h-4 w-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-semibold text-sm">Agendamento Rápido</span>
                      <span className="block text-xs text-muted-foreground">Enviamos para várias profissionais disponíveis</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("choose")}
                    className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                      mode === "choose" ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border hover:border-accent/40"
                    }`}
                  >
                    <span className="h-9 w-9 rounded-lg grid place-items-center bg-primary/10 text-primary">
                      <Users className="h-4 w-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-semibold text-sm">Escolher Profissional</span>
                      <span className="block text-xs text-muted-foreground">Você escolhe quem vai realizar o serviço</span>
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Tipo de Imóvel</div>
                <div className="grid grid-cols-2 gap-2">
                  {propertyOptions.map((opt) => {
                    const Active = propertyType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPropertyType(opt.id)}
                        className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-medium transition ${
                          Active ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border hover:border-accent/40"
                        }`}
                      >
                        <opt.icon className="h-4 w-4 text-muted-foreground" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Link
                to={mode === "choose" ? "/professionals" : "/auth"}
                search={mode === "choose" ? undefined : ({ mode: "signup" } as never)}
                className="block"
              >
                <Button size="lg" className="w-full gap-2 text-base font-semibold h-12" style={{ background: "var(--accent)" }}>
                  <Zap className="h-4 w-4" /> Agendar Agora <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ————————————————— FEATURED ————————————————— */
type Pro = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  bio: string | null;
};

function FeaturedSection({ city, pros }: { city: string; pros: Pro[] }) {
  return (
    <section className="relative py-20" style={{ background: "var(--gradient-hero)" }}>
      <div
        aria-hidden
        className="absolute inset-0 opacity-70 pointer-events-none"
        style={{ backgroundImage: "var(--dot-pattern)", backgroundSize: "22px 22px" }}
      />
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center mb-12 space-y-2">
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">
            Melhores Diaristas em {city}
          </h2>
          <p className="text-muted-foreground">Diaristas qualificadas, avaliadas e prontas para atender você.</p>
        </div>

        {pros.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {pros.slice(0, 3).map((p) => (
              <ProCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma diarista cadastrada ainda.{" "}
            <Link to="/auth" search={{ mode: "signup", role: "worker" } as never} className="text-primary font-semibold">
              Seja a primeira
            </Link>.
          </div>
        )}

        <div className="text-center mt-8">
          <Link to="/professionals" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Ver todas as diaristas <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ProCard({ p }: { p: Pro }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="h-16 w-16 rounded-xl bg-primary/10 text-primary grid place-items-center font-bold text-xl overflow-hidden">
            {p.avatar_url ? (
              <img src={p.avatar_url} alt={p.full_name ?? ""} className="h-full w-full object-cover" />
            ) : (
              (p.full_name ?? "?")[0]
            )}
          </div>
          <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-highlight grid place-items-center text-white shadow" style={{ background: "var(--highlight)" }}>
            <BadgeCheck className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="font-bold truncate">{p.full_name ?? "Diarista"}</div>
            <BadgeCheck className="h-4 w-4 text-accent shrink-0" />
          </div>
          <div className="flex items-center gap-2 text-sm mt-0.5">
            <span className="inline-flex items-center gap-1 font-semibold">
              <Star className="h-3.5 w-3.5" style={{ color: "var(--highlight)", fill: "var(--highlight)" }} />
              {Number(p.rating_avg ?? 0).toFixed(1)}
            </span>
            <span className="text-muted-foreground text-xs">{p.rating_count ?? 0}+ limpezas</span>
          </div>
          <div className="mt-1">
            <span className="inline-block rounded-md bg-secondary text-secondary-foreground text-[11px] font-medium px-2 py-0.5">
              Verificada
            </span>
          </div>
        </div>
      </div>
      {p.bio && <p className="text-sm text-muted-foreground mt-4 line-clamp-3">{p.bio}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link to="/professionals/$id" params={{ id: p.id }}>
          <Button variant="outline" className="w-full gap-1">Ver Perfil <ArrowRight className="h-3.5 w-3.5" /></Button>
        </Link>
        <Link to="/professionals/$id" params={{ id: p.id }}>
          <Button className="w-full gap-1" style={{ background: "var(--accent)" }}>
            <Calendar className="h-3.5 w-3.5" /> Agendar
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ————————————————— WHY ————————————————— */
function WhySection() {
  const items = [
    { icon: Zap, tint: "accent", title: "Agendamento Rápido", desc: "Agende em menos de 3 minutos, 100% online e sem complicação." },
    { icon: Target, tint: "accent", title: "Controle Total", desc: "Escolha o profissional, dia e duração que melhor se encaixam." },
    { icon: Calendar, tint: "accent", title: "Flexibilidade", desc: "Encontre horários que se encaixem na sua disponibilidade." },
    { icon: MessageCircle, tint: "primary", title: "Suporte 24/7", desc: "Suporte do pré ao pós limpeza, reagendamento garantido." },
  ];
  return (
    <section id="por-que" className="relative py-20" style={{ background: "var(--gradient-hero)" }}>
      <div
        aria-hidden
        className="absolute inset-0 opacity-70 pointer-events-none"
        style={{ backgroundImage: "var(--dot-pattern)", backgroundSize: "22px 22px" }}
      />
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center mb-12 space-y-2">
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">Por que escolher a BabyClean?</h2>
          <p className="text-muted-foreground">Simplificamos o agendamento de serviços para sua casa e empresa.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((it) => {
            const isPrimary = it.tint === "primary";
            return (
              <div key={it.title} className="relative rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-card)]">
                <span
                  className="absolute inset-x-6 top-0 h-1 rounded-b-full"
                  style={{ background: isPrimary ? "var(--primary)" : "var(--accent)" }}
                />
                <div
                  className="h-12 w-12 rounded-xl grid place-items-center mb-4"
                  style={{
                    background: isPrimary ? "color-mix(in oklab, var(--primary) 12%, transparent)" : "color-mix(in oklab, var(--accent) 15%, transparent)",
                    color: isPrimary ? "var(--primary)" : "var(--accent)",
                  }}
                >
                  <it.icon className="h-6 w-6" />
                </div>
                <div className="font-bold text-lg">{it.title}</div>
                <p className="text-sm text-muted-foreground mt-2">{it.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ————————————————— BE WORKER ————————————————— */
function BeWorkerSection() {
  const perks = [
    { icon: Clock, text: "Escolha seus horários" },
    { icon: Wallet, text: "Renda extra ou principal" },
    { icon: Users, text: "Milhares de clientes" },
    { icon: HeartHandshake, text: "Suporte dedicado" },
  ];
  const stats = [
    { v: "500+", l: "Profissionais ativas" },
    { v: "R$ 150", l: "Média por serviço" },
    { v: "4.8", l: "Avaliação média" },
    { v: "72h", l: "Tempo de aprovação" },
  ];
  return (
    <section
      className="relative overflow-hidden py-20 text-white"
      style={{ background: "var(--surface-dark)" }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: "var(--plus-pattern)" }}
      />
      <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-semibold text-accent">
            Oportunidade
          </span>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">
            Seja uma Diarista <span style={{ color: "var(--accent)" }}>BabyClean</span>
          </h2>
          <p className="text-white/70 max-w-lg">
            Trabalhe com flexibilidade, escolha seus clientes e aumente sua renda.
            Junte-se a centenas de profissionais que já transformaram suas carreiras.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 max-w-lg">
            {perks.map((p) => (
              <div key={p.text} className="flex items-center gap-3 text-sm">
                <span className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 grid place-items-center">
                  <p.icon className="h-4 w-4 text-accent" />
                </span>
                <span>{p.text}</span>
              </div>
            ))}
          </div>
          <Link to="/auth" search={{ mode: "signup", role: "worker" } as never}>
            <Button size="lg" className="gap-2 h-12 px-6" style={{ background: "var(--accent)" }}>
              Quero ser Diarista <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((s) => (
            <div key={s.l} className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-6">
              <div className="text-3xl lg:text-4xl font-extrabold tracking-tight">{s.v}</div>
              <div className="text-sm text-white/70 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ————————————————— FOOTER ————————————————— */
function FooterSection() {
  return (
    <footer id="contato" className="bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8 text-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </span>
            Baby<span className="text-primary">Clean</span>
          </div>
          <p className="text-muted-foreground">Marketplace de diaristas verificadas.</p>
        </div>
        <div>
          <div className="font-semibold mb-3">Cliente</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/professionals" className="hover:text-primary">Encontrar diarista</Link></li>
            <li><a href="#por-que" className="hover:text-primary">Como funciona</a></li>
            <li><Link to="/auth" className="hover:text-primary">Entrar</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-3">Diarista</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/auth" search={{ mode: "signup", role: "worker" } as never} className="hover:text-primary">Cadastrar-se</Link></li>
            <li><Link to="/auth" className="hover:text-primary">Painel</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-3">Contato</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><a href="mailto:ola@babyclean.com.br" className="hover:text-primary">ola@babyclean.com.br</a></li>
            <li><a href="https://wa.me/5547999999999" className="hover:text-primary">WhatsApp</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BabyClean — Todos os direitos reservados.
      </div>
    </footer>
  );
}
