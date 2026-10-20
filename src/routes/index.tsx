import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ProfessionalCard } from "@/components/ProfessionalCard";
import {
  ShieldCheck, ArrowRight, Zap, Users, Home, Building2,
  Store, Building, BadgeCheck, Lock, RefreshCcw, Wallet,
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
  const { roles, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && roles.includes("professional")) {
      navigate({ to: "/pro" });
    }
  }, [loading, roles, navigate]);
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

  const modes = [
    { id: "fast", title: "Rápido", desc: "Enviamos para várias profissionais", icon: Zap },
    { id: "choose", title: "Escolher", desc: "Você escolhe quem realiza o serviço", icon: Users },
  ] as const;
  const activeMode = modes.find((m) => m.id === mode)!;

  const trust = [
    { icon: BadgeCheck, label: "Profissionais verificadas" },
    { icon: Lock, label: "Pagamento seguro" },
    { icon: RefreshCcw, label: "Refazemos se não ficar bom" },
  ];

  return (
    <section className="relative overflow-hidden border-b border-[var(--bc-navy)]/5 bg-gradient-to-b from-white via-[var(--bc-paper)] to-[var(--bc-paper)]">
      <div aria-hidden className="bc-tiles absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "color-mix(in oklab, var(--bc-teal-soft) 30%, transparent)" }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 lg:px-10 lg:py-24">
        <div className="bc-rise max-w-2xl">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--bc-teal)]/30 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-[var(--bc-navy-2)] shadow-sm backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--bc-teal)]" />
            Diaristas em {city}
          </span>

          <h1 className="font-display text-[2.75rem] font-extrabold leading-[1] tracking-[-0.035em] text-[var(--bc-navy)] sm:text-6xl lg:text-7xl xl:text-[5.25rem]">
            Sua casa,
            <br />
            <span className="relative inline-block text-[var(--bc-teal)]">
              impecável.
              <svg
                aria-hidden
                viewBox="0 0 300 14"
                preserveAspectRatio="none"
                className="bc-draw absolute -bottom-1 left-0 h-[0.28em] w-full"
              >
                <defs>
                  <linearGradient id="bc-shine" x1="0" x2="1">
                    <stop offset="0" stopColor="#10b981" />
                    <stop offset="1" stopColor="#3aa8d8" />
                  </linearGradient>
                </defs>
                <path d="M3 9 C 70 2, 150 3, 215 7 S 285 6, 297 4" fill="none" stroke="url(#bc-shine)" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          <p className="mt-7 max-w-lg text-base font-medium leading-relaxed text-[var(--bc-navy-2)] sm:text-lg">
            A Gersepa Solutions conecta residências exclusivas às profissionais de limpeza mais qualificadas de {city}.
          </p>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {trust.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-sm font-semibold text-[var(--bc-navy)]">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[var(--bc-teal)] shadow-sm ring-1 ring-[var(--bc-navy)]/5">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="bc-rise relative w-full max-w-md justify-self-center lg:justify-self-end" style={{ animationDelay: "120ms" }}>
          <div
            aria-hidden
            className="absolute -inset-3 -z-10 rounded-[36px] opacity-60 blur-2xl"
            style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--bc-teal-soft) 55%, transparent), color-mix(in oklab, var(--bc-sky-soft) 55%, transparent))" }}
          />
          <div className="overflow-hidden rounded-[28px] border border-[var(--bc-navy)]/5 bg-white shadow-[var(--shadow-elevated)]">
            <div className="p-6 sm:p-8">
              <h2 className="font-display text-2xl font-bold text-[var(--bc-navy)]">Agende sua limpeza</h2>
              <p className="mt-1 text-sm text-[var(--bc-navy-2)]/70">Escolha o melhor formato para sua limpeza.</p>

              <div className="mt-6">
                <div className="mb-2 text-xs font-semibold text-[var(--bc-navy-2)]">Como deseja agendar?</div>
                <div role="tablist" aria-label="Como deseja agendar" className="grid grid-cols-2 gap-1 rounded-2xl bg-[var(--bc-mist)] p-1">
                  {modes.map((m) => (
                    <ModeButton
                      key={m.id}
                      active={mode === m.id}
                      onClick={() => setMode(m.id)}
                      icon={<m.icon className="h-4 w-4" />}
                      title={m.title}
                    />
                  ))}
                </div>
                <p className="mt-2 min-h-[1.25rem] text-xs text-[var(--bc-navy-2)]/70" aria-live="polite">
                  {activeMode.desc}
                </p>
              </div>

              <div className="mt-5">
                <div className="mb-2 text-xs font-semibold text-[var(--bc-navy-2)]">Tipo de imóvel</div>
                <div className="grid grid-cols-2 gap-2">
                  {propertyOptions.map((opt) => {
                    const active = propertyType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setPropertyType(opt.id)}
                        className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-semibold transition-all duration-200 ${
                          active
                            ? "border-[var(--bc-teal)] bg-[var(--bc-mist)] text-[var(--bc-navy)] shadow-[inset_0_0_0_1px_var(--bc-teal)]"
                            : "border-[var(--bc-navy)]/10 bg-white text-[var(--bc-navy)]/70 hover:border-[var(--bc-teal)]/50 hover:text-[var(--bc-navy)]"
                        }`}
                      >
                        <opt.icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[var(--bc-teal)]" : ""}`} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Link
                to={mode === "choose" ? "/professionals" : "/agendamento-rapido"}
                search={{ type: propertyType } as never}
                className="mt-6 block"
              >
                <Button
                  size="lg"
                  className="group h-14 w-full rounded-2xl border-0 text-base font-bold text-white shadow-[var(--shadow-glow-teal)] transition-all duration-300 hover:brightness-105"
                  style={{ background: "var(--gradient-cta)" }}
                >
                  Agendar agora
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>

              <p className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-[var(--bc-navy-2)]/70">
                <Lock className="h-3.5 w-3.5 text-[var(--bc-teal)]" />
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
  active, onClick, icon, title,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
        active
          ? "bg-white text-[var(--bc-navy)] shadow-[0_1px_2px_rgb(12_35_64/0.08),0_4px_12px_-4px_rgb(12_35_64/0.12)]"
          : "text-[var(--bc-navy-2)]/65 hover:text-[var(--bc-navy)]"
      }`}
    >
      <span className={active ? "text-[var(--bc-teal)]" : ""}>{icon}</span>
      <span className="truncate">{title}</span>
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
    <section className="bg-white px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col justify-between gap-6 lg:mb-14 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold text-[var(--bc-teal)]">
              Curadoria Gersepa Solutions
            </p>
            <h2 className="font-display text-3xl font-extrabold leading-[1.05] tracking-[-0.03em] text-[var(--bc-navy)] sm:text-5xl">
              Elite da limpeza em {city}.
            </h2>
            <p className="mt-4 max-w-xl text-base font-medium text-[var(--bc-navy-2)] sm:text-lg">
              Nossas profissionais passam por um rigoroso protocolo de verificação antes de atender você.
            </p>
          </div>
          <Link
            to="/professionals"
            className="group inline-flex shrink-0 items-center gap-3 self-start rounded-full border border-[var(--bc-navy)]/10 bg-[var(--bc-paper)] py-2 pl-5 pr-2 font-semibold text-[var(--bc-navy)] transition-colors hover:border-[var(--bc-teal)]/50 lg:self-auto"
          >
            Conhecer todas
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--bc-navy)] text-white transition-colors duration-300 group-hover:bg-[var(--bc-teal)]">
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        {pros.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pros.slice(0, 4).map((p) => <ProfessionalCard key={p.id} p={p} />)}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[var(--bc-navy)]/15 bg-[var(--bc-paper)] py-16 text-center text-[var(--bc-navy-2)]">
            Nenhuma diarista cadastrada ainda.{" "}
            <Link to="/cadastro" search={{ tipo: "professional" } as never} className="font-semibold text-[var(--bc-teal)] hover:underline">
              Seja a primeira
            </Link>.
          </div>
        )}
      </div>
    </section>
  );
}

/* ————————————————— WHY ————————————————— */
function WhySection() {
  const items = [
    { icon: BadgeCheck, title: "Curadoria exclusiva", desc: "Profissionais com referências comprovadas são admitidas na rede após protocolo rigoroso." },
    { icon: ShieldCheck, title: "Seguro e garantia", desc: "Garantimos o refazimento total do serviço caso ele não atinja nosso padrão de excelência." },
    { icon: Wallet, title: "Pagamento sem fricção", desc: "Agende, pague e gerencie tudo pelo app. Transparência total, sem surpresas." },
  ];
  const checklist = ["Cozinha", "Banheiros", "Quartos", "Sala e áreas comuns"];

  return (
    <section
      id="sobre"
      className="relative overflow-hidden px-5 py-16 text-white sm:px-8 sm:py-20 lg:px-10 lg:py-28"
      style={{ background: "linear-gradient(160deg, var(--bc-navy) 0%, var(--bc-navy-2) 100%)" }}
    >
      <span id="por-que" className="absolute top-0" aria-hidden />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-[var(--bc-teal)]/25 blur-[120px]" />
        <div className="absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full bg-[var(--bc-sky)]/25 blur-[120px]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="mb-3 text-sm font-semibold text-[var(--bc-teal-soft)]">
            O padrão Gersepa Solutions
          </p>
          <h2 className="font-display text-3xl font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
            Por que a Gersepa Solutions?
          </h2>

          <div className="mt-10 space-y-7 lg:mt-12">
            {items.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-[var(--bc-teal-soft)] ring-1 ring-white/15">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold tracking-tight">{title}</h3>
                  <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="rounded-[28px] bg-white p-6 text-[var(--bc-navy)] shadow-[var(--shadow-elevated)] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-2xl font-bold">Padrão hoteleiro 5★</p>
                <p className="mt-1.5 max-w-xs text-sm text-[var(--bc-navy-2)]/70">
                  Metodologia baseada em checklists de hotelaria de luxo, adaptada ao seu lar.
                </p>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--bc-mist)] text-[var(--bc-teal)]">
                <ShieldCheck className="h-5 w-5" />
              </span>
            </div>

            <ul className="mt-6 divide-y divide-[var(--bc-navy)]/8 rounded-2xl border border-[var(--bc-navy)]/8">
              {checklist.map((label, i) => (
                <li key={label} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--bc-teal)] text-white">
                    <svg viewBox="0 0 24 24" className="bc-tick h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12.5l4.5 4.5L19 7.5" style={{ ["--d" as string]: `${0.3 + i * 0.25}s` }} />
                    </svg>
                  </span>
                  <span className="text-sm font-semibold sm:text-base">{label}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-baseline gap-3 rounded-2xl bg-[var(--bc-mist)] px-5 py-4">
              <span className="font-display text-4xl font-extrabold leading-none text-[var(--bc-teal)]">+15k</span>
              <span className="text-sm font-semibold text-[var(--bc-navy)]">limpezas concluídas</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ————————————————— FOOTER ————————————————— */
function FooterSection() {
  const linkCls = "transition-colors hover:text-[var(--bc-teal-soft)]";
  const headCls = "mb-4 font-display text-sm font-bold text-white";
  return (
    <footer id="contato" className="bg-[var(--bc-navy)] text-white/75">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 text-sm sm:px-8 md:grid-cols-4 lg:px-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <ShieldCheck className="h-5 w-5 text-[var(--bc-teal-soft)]" />
            </span>
            Gersepa<span className="text-[var(--bc-teal-soft)]"> Solutions</span>
          </div>
          <p className="max-w-xs leading-relaxed">
            Marketplace editorial de diaristas verificadas em Joinville.
          </p>
        </div>
        <div>
          <div className={headCls}>Cliente</div>
          <ul className="space-y-2.5">
            <li><Link to="/professionals" className={linkCls}>Encontrar diarista</Link></li>
            <li><a href="#por-que" className={linkCls}>Como funciona</a></li>
            <li><Link to="/auth" className={linkCls}>Entrar</Link></li>
          </ul>
        </div>
        <div>
          <div className={headCls}>Diarista</div>
          <ul className="space-y-2.5">
            <li><Link to="/cadastro" search={{ tipo: "professional" } as never} className={linkCls}>Cadastrar-se</Link></li>
            <li><Link to="/auth" className={linkCls}>Painel</Link></li>
          </ul>
        </div>
        <div>
          <div className={headCls}>Contato</div>
          <ul className="space-y-2.5">
            <li><a href="mailto:contato@gersepa.com.br" className={linkCls}>contato@gersepa.com.br</a></li>
            <li><a href="https://wa.me/5547999999999" className={linkCls}>WhatsApp</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-6 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Gersepa Solutions — Todos os direitos reservados.
      </div>
    </footer>
  );
}
