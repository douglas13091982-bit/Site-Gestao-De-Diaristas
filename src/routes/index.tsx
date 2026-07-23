import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ProfessionalCard } from "@/components/ProfessionalCard";
import {
  ShieldCheck, Star, ArrowRight, Zap, Users, Home, Building2,
  Store, Building, MessageCircle, BadgeCheck,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gersepa Solutions — Sua casa impecável em Joinville" },
      { name: "description", content: "Marketplace editorial de diaristas premium em Joinville. Curadoria rigorosa, pagamento seguro e garantia de satisfação." },
      { property: "og:title", content: "Gersepa Solutions — Sua casa impecável em Joinville" },
      { property: "og:description", content: "Marketplace editorial de diaristas premium em Joinville. Curadoria rigorosa, pagamento seguro e garantia de satisfação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const city = "Joinville";
  const featured = useQuery({
    queryKey: ["featured-pros"],
    queryFn: async () => {
      const { data } = await supabase.rpc("list_public_professionals", { _limit: 4 });
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-[var(--bc-paper)] text-[var(--bc-navy)] selection:bg-[var(--bc-teal-soft)] selection:text-[var(--bc-navy)]">
      <Header />
      <HeroSection city={city} />
      <FeaturedSection city={city} pros={featured.data ?? []} />
      <WhySection />
      <FooterSection />
      <a
        href="https://wa.me/5547999999999"
        target="_blank"
        rel="noreferrer"
        aria-label="Fale conosco no WhatsApp"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[var(--bc-teal)] text-white grid place-items-center shadow-[var(--shadow-glow-teal)] hover:scale-105 hover:bg-[var(--bc-teal-soft)] hover:text-[var(--bc-navy)] transition-all duration-300"
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
    <section className="relative flex flex-col lg:flex-row min-h-[92vh] border-b border-[var(--bc-navy)]/5">
      <div className="w-full lg:w-3/5 flex items-center px-6 sm:px-10 lg:px-24 py-16 lg:py-24 relative overflow-hidden bg-white">
        <div
          aria-hidden
          className="absolute top-0 left-0 w-72 h-72 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"
          style={{ background: "color-mix(in oklab, var(--bc-teal-soft) 22%, transparent)" }}
        />
        <div className="relative z-10 max-w-2xl bc-rise">
          <span className="inline-block px-4 py-1.5 mb-8 rounded-full border border-[var(--bc-teal)] text-[var(--bc-teal)] text-[10px] font-bold uppercase tracking-[0.22em]">
            Excelência em {city}
          </span>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-[104px] font-extrabold leading-[0.88] tracking-tight mb-8 text-[var(--bc-navy)]">
            Sua casa,
            <br />
            <span className="text-[var(--bc-teal)]">impecável.</span>
          </h1>
          <p className="text-lg sm:text-xl text-[var(--bc-navy-2)] font-medium leading-relaxed mb-10 max-w-md">
            A Gersepa Solutions conecta residências exclusivas às profissionais de limpeza mais qualificadas de {city}.
          </p>

        </div>
      </div>

      <div className="w-full lg:w-2/5 relative flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-white">
        <div className="relative w-full max-w-md bg-white border border-black/5 rounded-[28px] shadow-2xl bc-rise overflow-hidden">
          <div className="px-7 sm:px-9 lg:px-10 pt-7 pb-6 bg-[linear-gradient(90deg,#10b981_0%,#22c1a4_45%,#3aa8d8_100%)]">
            <h2 className="font-display text-3xl font-bold text-white mb-1.5">Agende agora</h2>
            <p className="text-white/85 text-sm">Escolha o melhor formato para sua limpeza.</p>
          </div>

          <div className="space-y-5 p-7 sm:p-9 lg:p-10 pt-6">
            <div className="space-y-2">
              <div className="text-[10px] uppercase font-bold text-[var(--bc-navy-2)] tracking-[0.18em]">
                Como deseja agendar?
              </div>
              <div className="space-y-2">
                <ModeButton
                  active={mode === "fast"}
                  onClick={() => setMode("fast")}
                  icon={<Zap className="h-4 w-4" />}
                  title="Agendamento Rápido"
                  desc="Enviamos para várias profissionais"
                />
                <ModeButton
                  active={mode === "choose"}
                  onClick={() => setMode("choose")}
                  icon={<Users className="h-4 w-4" />}
                  title="Escolher Profissional"
                  desc="Você escolhe quem realiza o serviço"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] uppercase font-bold text-[var(--bc-navy-2)] tracking-[0.18em]">
                Tipo de imóvel
              </div>
              <div className="grid grid-cols-2 gap-2">
                {propertyOptions.map((opt) => {
                  const Active = propertyType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPropertyType(opt.id)}
                      className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-300 ${
                        Active
                          ? "border-[var(--bc-teal)] bg-[var(--bc-mist)] text-[var(--bc-navy)]"
                          : "border-black/10 bg-white text-[var(--bc-navy)]/70 hover:border-[var(--bc-teal)]/40 hover:text-[var(--bc-navy)]"
                      }`}
                    >
                      <opt.icon className="h-4 w-4" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Link
              to={mode === "choose" ? "/professionals" : "/agendamento-rapido"}
              search={{ type: propertyType } as never}
              className="block"
            >
              <Button
                size="lg"
                className="group w-full h-14 rounded-2xl text-base font-extrabold tracking-wide bg-[var(--bc-teal)] text-white hover:bg-[var(--bc-navy-2)] transition-all duration-300"
              >
                AGENDAR AGORA
                <ArrowRight className="h-4 w-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>

            <div className="flex items-center justify-center gap-2 pt-2 opacity-80">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--bc-teal)] animate-pulse" />
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-[var(--bc-navy-2)]">
                Pagamento seguro • Garantia total
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ModeButton({
  active, onClick, icon, title, desc,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-300 ${
        active
          ? "border-[var(--bc-teal)] bg-[var(--bc-mist)]"
          : "border-black/10 bg-white hover:border-[var(--bc-teal)]/40"
      }`}
    >
      <span
        className={`h-9 w-9 shrink-0 rounded-xl grid place-items-center transition-colors ${
          active ? "bg-[var(--bc-teal)] text-white" : "bg-[var(--bc-mist)] text-[var(--bc-teal)]"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-sm text-[var(--bc-navy)]">{title}</span>
        <span className="block text-[11px] text-[var(--bc-navy-2)]/60 truncate">{desc}</span>
      </span>
    </button>
  );
}

/* ————————————————— FEATURED ————————————————— */
type Pro = {
  id: string;
  full_name: string | null;
  profile_photo: string | null;
  city: string | null;
  rating: number | null;
  total_reviews: number | null;
  bio: string | null;
};

function FeaturedSection({ city, pros }: { city: string; pros: Pro[] }) {
  return (
    <section className="py-24 lg:py-32 px-6 sm:px-10 lg:px-24 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 lg:mb-20 gap-8">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--bc-teal)] mb-4">
              Curadoria Gersepa Solutions
            </p>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[0.95] mb-6 text-[var(--bc-navy)]">
              Elite da limpeza em {city}.
            </h2>
            <p className="text-lg text-[var(--bc-navy-2)] font-medium max-w-xl">
              Nossas profissionais passam por um rigoroso protocolo de verificação antes de atender você.
            </p>
          </div>
          <Link to="/professionals" className="group inline-flex items-center gap-4 shrink-0">
            <span className="font-bold text-[var(--bc-navy)] border-b-2 border-[var(--bc-navy)] pb-1 group-hover:text-[var(--bc-teal)] group-hover:border-[var(--bc-teal)] transition-colors">
              Conhecer todas
            </span>
            <span className="w-10 h-10 rounded-full border border-[var(--bc-navy)]/15 grid place-items-center text-[var(--bc-navy)] group-hover:bg-[var(--bc-navy)] group-hover:text-white group-hover:border-[var(--bc-navy)] transition-all duration-300">
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        {pros.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pros.slice(0, 4).map((p) => <ProfessionalCard key={p.id} p={p} />)}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-[var(--bc-navy)]/10 rounded-3xl text-[var(--bc-navy-2)]">
            Nenhuma diarista cadastrada ainda.{" "}
            <Link to="/cadastro" search={{ tipo: "professional" } as never} className="text-[var(--bc-teal)] font-semibold hover:underline">
              Seja a primeira
            </Link>.
          </div>
        )}
      </div>
    </section>
  );
}

function ProCard({ p, index }: { p: Pro; index: number }) {
  const initial = (p.full_name ?? "?")[0]?.toUpperCase() ?? "?";
  const rating = Number(p.rating ?? 0).toFixed(1);
  return (
    <div className="group bc-rise" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="relative aspect-[3/4] rounded-3xl overflow-hidden mb-6 bg-[var(--bc-mist)]">
        {p.profile_photo ? (
          <img
            src={p.profile_photo}
            alt={p.full_name ?? "Diarista"}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-[1.04] transition-all duration-[900ms]"
          />
        ) : (
          <div className="w-full h-full grid place-items-center bg-gradient-to-br from-[var(--bc-navy-2)] to-[var(--bc-navy)] text-white font-display font-extrabold text-7xl">
            {initial}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bc-navy)]/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <span className="absolute top-5 left-5 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[9px] font-black uppercase text-[var(--bc-navy)] tracking-[0.18em] shadow">
          Verificada
        </span>
        <Link
          to="/agendamento"
          search={{ pro: p.id, city: "joinville", dur: 4, type: "residential", rooms: 2, baths: 1 }}
          className="absolute bottom-5 left-5 right-5 h-11 rounded-full bg-[var(--bc-teal-soft)] text-[var(--bc-navy)] font-bold text-sm grid place-items-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500"
        >
          Agendar agora
        </Link>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-xl font-bold tracking-tight truncate flex items-center gap-1.5">
            {p.full_name ?? "Diarista"}
            <BadgeCheck className="h-4 w-4 text-[var(--bc-teal)] shrink-0" />
          </h3>
          <span className="text-[var(--bc-teal)] font-bold text-sm shrink-0 inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-current" /> {rating}
          </span>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--bc-navy-2)]">
          {p.total_reviews ?? 0}+ limpezas concluídas
        </p>
        {p.bio && (
          <p className="text-sm text-[var(--bc-navy-2)]/80 line-clamp-2 pt-1 leading-relaxed">
            {p.bio}
          </p>
        )}
      </div>
    </div>
  );
}

/* ————————————————— WHY ————————————————— */
function WhySection() {
  const items = [
    { n: "01", title: "CURADORIA EXCLUSIVA", desc: "Profissionais com referências comprovadas são admitidas na rede após protocolo rigoroso." },
    { n: "02", title: "SEGURO E GARANTIA", desc: "Garantimos o refazimento total do serviço caso ele não atinja nosso padrão de excelência." },
    { n: "03", title: "PAGAMENTO SEM FRICÇÃO", desc: "Agende, pague e gerencie tudo pelo app. Transparência total, sem surpresas." },
  ];
  return (
    <section id="por-que" className="relative py-24 lg:py-32 px-6 sm:px-10 lg:px-24 text-white overflow-hidden" style={{ background: "linear-gradient(90deg, var(--bc-teal) 0%, var(--bc-sky) 100%)" }}>
      <div aria-hidden className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-white rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-[var(--bc-sky-soft)] rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/90 mb-4">
            O padrão Gersepa Solutions
          </p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-12 lg:mb-16 leading-[0.92]">
            Por que a
            <br />
            <span className="text-white/95">Gersepa Solutions?</span>
          </h2>
          <div className="space-y-12 lg:space-y-14">
            {items.map((it) => (
              <div key={it.n} className="flex gap-6 lg:gap-8 group">
                <span className="font-display text-3xl lg:text-4xl font-bold text-white opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                  {it.n}
                </span>
                <div>
                  <h4 className="font-display text-lg lg:text-xl font-bold mb-3 tracking-[0.06em]">
                    {it.title}
                  </h4>
                  <p className="text-white/75 leading-relaxed text-sm lg:text-base max-w-md">
                    {it.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="aspect-square rounded-[40px] lg:rounded-[48px] overflow-hidden border border-white/20 bg-white/10 backdrop-blur-sm grid place-items-center">
            <div className="p-12 text-center">
              <ShieldCheck className="h-16 w-16 text-white mx-auto mb-6 opacity-90" />
              <p className="font-display text-2xl font-bold text-white mb-2">Padrão hoteleiro 5★</p>
              <p className="text-white/70 text-sm max-w-xs mx-auto">
                Metodologia baseada em checklists de hotelaria de luxo, adaptada ao seu lar.
              </p>
            </div>
          </div>
          <div className="absolute -bottom-8 -left-4 sm:-bottom-10 sm:-left-10 bg-white p-8 lg:p-12 rounded-2xl lg:rounded-3xl shadow-[var(--shadow-elevated)]">
            <p className="font-display text-5xl lg:text-6xl font-extrabold text-[var(--bc-teal)] leading-none mb-2">
              +15k
            </p>
            <p className="text-[var(--bc-navy)] font-bold text-[10px] uppercase tracking-[0.24em]">
              Limpezas concluídas
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ————————————————— FOOTER ————————————————— */
function FooterSection() {
  return (
    <footer id="contato" className="bg-white border-t border-[var(--bc-navy)]/8">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-24 py-16 grid md:grid-cols-4 gap-10 text-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-display font-bold text-lg text-[var(--bc-navy)]">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bc-navy)] text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            Gersepa<span className="text-[var(--bc-teal)]">Solutions</span>
          </div>
          <p className="text-[var(--bc-navy-2)]/70 max-w-xs leading-relaxed">
            Marketplace editorial de diaristas verificadas em Joinville.
          </p>
        </div>
        <div>
          <div className="font-display font-bold mb-4 text-[var(--bc-navy)] text-[11px] uppercase tracking-[0.2em]">Cliente</div>
          <ul className="space-y-2.5 text-[var(--bc-navy-2)]/80">
            <li><Link to="/professionals" className="hover:text-[var(--bc-teal)] transition-colors">Encontrar diarista</Link></li>
            <li><a href="#por-que" className="hover:text-[var(--bc-teal)] transition-colors">Como funciona</a></li>
            <li><Link to="/auth" className="hover:text-[var(--bc-teal)] transition-colors">Entrar</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-display font-bold mb-4 text-[var(--bc-navy)] text-[11px] uppercase tracking-[0.2em]">Diarista</div>
          <ul className="space-y-2.5 text-[var(--bc-navy-2)]/80">
            <li><Link to="/cadastro" search={{ tipo: "professional" } as never} className="hover:text-[var(--bc-teal)] transition-colors">Cadastrar-se</Link></li>
            <li><Link to="/auth" className="hover:text-[var(--bc-teal)] transition-colors">Painel</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-display font-bold mb-4 text-[var(--bc-navy)] text-[11px] uppercase tracking-[0.2em]">Contato</div>
          <ul className="space-y-2.5 text-[var(--bc-navy-2)]/80">
            <li><a href="mailto:contato@gersepa.com.br" className="hover:text-[var(--bc-teal)] transition-colors">contato@gersepa.com.br</a></li>
            <li><a href="https://wa.me/5547999999999" className="hover:text-[var(--bc-teal)] transition-colors">WhatsApp</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--bc-navy)]/8 py-6 text-center text-[11px] uppercase tracking-[0.2em] text-[var(--bc-navy-2)]/60">
        © {new Date().getFullYear()} Gersepa Solutions — Todos os direitos reservados.
      </div>
    </footer>
  );
}