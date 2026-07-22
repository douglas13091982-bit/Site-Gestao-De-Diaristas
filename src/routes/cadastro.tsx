import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Briefcase, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  tipo: fallback(z.string(), "").default(""),
});

type Tipo = "client" | "professional" | null;

function normalizeTipo(v: string): Tipo {
  if (v === "client" || v === "cliente") return "client";
  if (v === "professional" || v === "profissional" || v === "worker") return "professional";
  return null;
}

export const Route = createFileRoute("/cadastro")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Criar conta — Gersepa Solutions" },
      { name: "description", content: "Cadastre-se como cliente ou profissional na Gersepa Solutions." },
      { property: "og:title", content: "Criar conta — Gersepa Solutions" },
      { property: "og:description", content: "Escolha seu tipo de conta e cadastre-se em segundos." },
    ],
  }),
  component: CadastroPage,
});

function CadastroPage() {
  const { tipo: tipoParam } = Route.useSearch();
  const nav = useNavigate();
  const [tipo, setTipo] = useState<Tipo>(normalizeTipo(tipoParam));

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  function selectTipo(t: Exclude<Tipo, null>) {
    setTipo(t);
    nav({ to: "/cadastro", search: { tipo: t }, replace: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tipo) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/${tipo === "professional" ? "onboarding" : "dashboard"}`,
          data: { full_name: fullName, phone, role: tipo },
        },
      });
      if (error) throw error;
      toast.success("Conta criada com sucesso!");
      nav({ to: tipo === "professional" ? "/onboarding" : "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    try {
      const { lovable } = await import("@/integrations/lovable");
      await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro Google");
    }
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-card border border-border rounded-2xl shadow-sm p-8 space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Criar Conta</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Cadastre-se para começar a usar a plataforma
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TipoCard
              icon={<UserIcon className="w-8 h-8" />}
              title="Sou Cliente"
              subtitle="Quero contratar serviços"
              tone="client"
              active={tipo === "client"}
              onClick={() => selectTipo("client")}
            />
            <TipoCard
              icon={<Briefcase className="w-8 h-8" />}
              title="Sou Profissional"
              subtitle="Quero oferecer serviços"
              tone="professional"
              active={tipo === "professional"}
              onClick={() => selectTipo("professional")}
            />
          </div>

          {!tipo && (
            <p className="text-center text-sm text-muted-foreground">
              Selecione uma opção acima para continuar
            </p>
          )}

          {tipo && (
            <form onSubmit={submit} className="space-y-4 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone / WhatsApp</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(47) 99999-9999" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>

              {tipo === "professional" && (
                <p className="text-xs text-muted-foreground">
                  Após criar a conta você completará seu perfil profissional (PIX, categoria, regiões, agenda).
                </p>
              )}

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Criando…" : "Criar Conta"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center"><span className="bg-card px-3 text-xs uppercase text-muted-foreground">ou</span></div>
              </div>

              <Button type="button" variant="outline" className="w-full" onClick={google}>
                Continuar com Google
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link to="/auth" className="text-primary font-semibold hover:underline">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function TipoCard({
  icon,
  title,
  subtitle,
  tone,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone: "client" | "professional";
  active: boolean;
  onClick: () => void;
}) {
  const activeClasses =
    tone === "client"
      ? "bg-primary text-primary-foreground border-primary"
      : "bg-orange-500 text-white border-orange-500";
  const idleClasses =
    tone === "client"
      ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
      : "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border-2 p-6 text-center transition flex flex-col items-center gap-2 ${
        active ? activeClasses : idleClasses
      }`}
    >
      {icon}
      <div className="font-bold text-lg mt-1">{title}</div>
      <div className={`text-sm ${active ? "opacity-90" : "opacity-80"}`}>{subtitle}</div>
    </button>
  );
}