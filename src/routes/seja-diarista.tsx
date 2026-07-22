import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  Clock,
  DollarSign,
  ShieldCheck,
  Calendar,
  UserCheck,
  Star,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/seja-diarista")({
  head: () => ({
    meta: [
      { title: "Seja Diarista — Gersepa Solutions" },
      {
        name: "description",
        content:
          "Trabalhe com liberdade e ganhe mais. Cadastre-se gratuitamente como profissional de limpeza na Gersepa Solutions.",
      },
      { property: "og:title", content: "Seja Diarista — Gersepa Solutions" },
      {
        property: "og:description",
        content:
          "Defina seus horários, escolha seus clientes e ganhe até R$100 por hora.",
      },
    ],
  }),
  component: SejaDiaristaPage,
});

const BENEFITS = [
  { icon: Clock, title: "Flexibilidade Total", desc: "Trabalhe quando quiser. Você define seus horários e escolhe os serviços que deseja aceitar." },
  { icon: DollarSign, title: "Ganhos Competitivos", desc: "Defina seu próprio preço por hora. Profissionais ganham em média R$65-100/hora na plataforma." },
  { icon: ShieldCheck, title: "Pagamento Garantido", desc: "Receba pagamentos de forma segura e pontual, diretamente na sua conta bancária." },
  { icon: Calendar, title: "Agenda Organizada", desc: "Gerencie todos os seus agendamentos em um só lugar, com notificações e lembretes." },
  { icon: UserCheck, title: "Clientes Verificados", desc: "Todos os clientes passam por verificação. Trabalhe com segurança e tranquilidade." },
  { icon: Star, title: "Construa sua Reputação", desc: "Receba avaliações e conquiste mais clientes com um perfil bem avaliado." },
];

const STEPS = [
  { n: 1, title: "Cadastre-se", desc: "Preencha seu perfil com suas informações, experiência e especialidades." },
  { n: 2, title: "Seja Verificado", desc: "Nossa equipe analisa seu perfil e documentos para garantir a segurança da plataforma." },
  { n: 3, title: "Comece a Trabalhar", desc: "Aceite solicitações de clientes na sua região e comece a ganhar dinheiro." },
];

const FAQS = [
  { q: "Quanto custa para me cadastrar na Gersepa Solutions?", a: "O cadastro é totalmente gratuito! Você não paga nada para criar seu perfil. Cobramos uma pequena taxa de serviço apenas quando você completa um trabalho." },
  { q: "Como funciona o pagamento?", a: "Os pagamentos são feitos via PIX diretamente para sua chave cadastrada, após a conclusão do serviço." },
  { q: "Preciso ter experiência prévia?", a: "Não é obrigatório, mas experiência ajuda a conquistar melhores avaliações e mais clientes." },
  { q: "Posso escolher em quais bairros trabalhar?", a: "Sim! Você define as regiões e cidades em que deseja atender." },
  { q: "E se eu tiver um problema com um cliente?", a: "Nossa equipe de suporte está disponível 7 dias por semana para mediar qualquer situação." },
  { q: "Quais documentos preciso enviar?", a: "RG, CPF e comprovante de residência. Documentos adicionais podem ser solicitados na verificação." },
  { q: "Posso cancelar um serviço agendado?", a: "Sim, mas cancelamentos frequentes podem afetar sua reputação na plataforma." },
  { q: "Como aumento minha visibilidade na plataforma?", a: "Mantenha seu perfil completo, aceite serviços rapidamente e conquiste boas avaliações." },
];

function SejaDiaristaPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-1.5 text-sm font-medium">
              <Sparkles className="h-4 w-4" /> Junte-se a milhares de profissionais
            </span>
            <h1 className="mt-6 text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              Trabalhe com <span className="text-primary">liberdade</span> e ganhe <span className="text-primary">mais</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              Seja um profissional de limpeza na Gersepa Solutions. Defina seus horários, escolha seus clientes e ganhe até R$100 por hora fazendo o que você já sabe fazer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" search={{ mode: "signup", role: "worker" } as never}>
                <Button size="lg" className="gap-2">Começar Agora <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <a href="#como-funciona">
                <Button size="lg" variant="outline">Como Funciona</Button>
              </a>
            </div>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=900&fit=crop"
              alt="Profissional de limpeza"
              className="rounded-3xl w-full object-cover aspect-[4/5] shadow-xl"
            />
            <div className="absolute bottom-6 left-6 right-6 bg-background/95 backdrop-blur rounded-2xl p-4 flex items-center gap-3 shadow-lg">
              <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-sm">Maria conseguiu um novo cliente!</div>
                <div className="text-xs text-muted-foreground">Joinville • Agora mesmo</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            ["10.000+", "Profissionais cadastrados"],
            ["R$65-100", "Média por hora"],
            ["4.8", "Avaliação média"],
            ["50.000+", "Serviços realizados"],
          ].map(([v, l]) => (
            <div key={l}>
              <div className="text-3xl md:text-4xl font-bold text-primary">{v}</div>
              <div className="text-sm text-muted-foreground mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold">Por que trabalhar com a Gersepa Solutions?</h2>
            <p className="mt-4 text-muted-foreground">Oferecemos as melhores condições para você crescer profissionalmente e ter mais qualidade de vida.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl bg-card border border-border p-6 hover:shadow-md transition">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section id="como-funciona" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold">Como começar?</h2>
            <p className="mt-4 text-muted-foreground">Em apenas 3 passos simples você já pode começar a trabalhar.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center">
                  {s.n}
                </div>
                <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link to="/auth" search={{ mode: "signup", role: "worker" } as never}>
              <Button size="lg" className="gap-2">Cadastre-se Gratuitamente <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 bg-primary/5">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <blockquote className="text-2xl font-medium leading-relaxed">
              "Desde que comecei na Gersepa Solutions, minha vida mudou completamente. Consigo organizar meu tempo, buscar meu filho na escola e ainda ganhar mais do que ganhava em empregos fixos."
            </blockquote>
            <div className="mt-6 flex items-center gap-3">
              <img src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=100&h=100&fit=crop&crop=face" alt="Carla" className="h-12 w-12 rounded-full object-cover" />
              <div>
                <div className="font-semibold">Carla Mendes</div>
                <div className="text-sm text-muted-foreground">Profissional há 2 anos • Joinville</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              ["R$4.500", "Média mensal"],
              ["4.9", "Avaliação"],
              ["320+", "Clientes atendidos"],
              ["25h", "Por semana"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl bg-card border border-border p-6 text-center">
                <div className="text-2xl font-bold text-primary">{v}</div>
                <div className="text-xs text-muted-foreground mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold">Perguntas Frequentes</h2>
            <p className="mt-4 text-muted-foreground">Tire suas dúvidas sobre trabalhar com a Gersepa Solutions.</p>
          </div>
          <div className="mt-10 space-y-3">
            {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">Suporte disponível 7 dias por semana</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">Pronto para começar?</h2>
          <p className="mt-4 opacity-90">
            Junte-se a milhares de profissionais que já estão transformando suas vidas com a Gersepa Solutions. O cadastro é gratuito e leva menos de 5 minutos.
          </p>
          <div className="mt-8">
            <Link to="/auth" search={{ mode: "signup", role: "worker" } as never}>
              <Button size="lg" variant="secondary" className="gap-2">
                Criar Minha Conta Grátis <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left font-medium hover:bg-secondary/40 transition"
      >
        <span>{q}</span>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-4 text-sm text-muted-foreground">{a}</div>}
    </div>
  );
}