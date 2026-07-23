import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { useServerFn } from "@tanstack/react-start";
import { toMessage } from "@/shared/lib/result";
import { RoleTabs } from "@/features/auth/login/components/RoleTabs";
import { PasswordSetupCard } from "@/features/auth/login/components/PasswordSetupCard";
import {
  checkEmailRegistered,
  sendPasswordSetupEmail,
  signInWithPassword,
  signUpAccount,
  requestPasswordSetupEmail,
  type LoginRole,
} from "@/features/auth/login/service";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
  role: z
    .string()
    .optional()
    .transform((v) => (v === "professional" || v === "worker" ? "professional" : v === "client" ? "client" : undefined))
    .pipe(z.enum(["client", "professional"]).optional()),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar ou cadastrar — Gersepa Solutions" },
      { name: "description", content: "Acesse sua conta Gersepa Solutions como cliente ou diarista." },
      { property: "og:title", content: "Entrar — Gersepa Solutions" },
      { property: "og:description", content: "Acesso ao marketplace Gersepa Solutions." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [role, setRole] = useState<LoginRole>(search.role ?? "client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [sending, setSending] = useState(false);
  const checkEmail = useServerFn(checkEmailRegistered);
  const sendSetup = useServerFn(sendPasswordSetupEmail);

  useEffect(() => {
    if (!loading && user) navigate({ to: (search.redirect as "/") ?? "/" });
  }, [user, loading, navigate, search.redirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const r = await signUpAccount({ email, password, fullName, role }, checkEmail);
        if (!r.ok && r.needsSetup) {
          setNeedsSetup(true);
          setMode("signin");
          toast.info("Este e-mail já está cadastrado. Crie sua senha para entrar.");
          return;
        }
        toast.success("Conta criada! Complete seu perfil.");
      } else {
        const r = await signInWithPassword(email, password, checkEmail);
        if (!r.ok && r.needsSetup) {
          setNeedsSetup(true);
          toast.info("Detectamos seu cadastro. Crie sua senha para acessar.");
          return;
        }
      }
    } catch (err) {
      toast.error(toMessage(err, "Erro ao autenticar"));
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordSetup() {
    if (!email) return toast.error("Informe seu e-mail primeiro");
    setSending(true);
    try {
      const r = await requestPasswordSetupEmail(email, checkEmail, sendSetup);
      if (!r.ok && r.notRegistered) {
        toast.error("Não encontramos cadastro com este e-mail. Crie uma conta.");
        setMode("signup");
        return;
      }
      toast.success("Enviamos um link no seu e-mail para criar sua senha.");
      setNeedsSetup(false);
    } catch (err) {
      toast.error(toMessage(err, "Erro ao enviar e-mail"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="bg-card border border-border rounded-2xl shadow-sm p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{mode === "signin" ? "Entrar" : "Criar conta"}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin" ? "Bem-vinda de volta ao Gersepa Solutions" : "Junte-se ao Gersepa Solutions"}
            </p>
          </div>

          {mode === "signup" && <RoleTabs value={role} onChange={setRole} />}

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div className="space-y-1">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "..." : mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          {mode === "signin" && (
            <PasswordSetupCard
              highlighted={needsSetup}
              sending={sending}
              onRequest={requestPasswordSetup}
            />
          )}

          <p className="text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Não tem conta? " : "Já tem conta? "}
            <button className="text-primary font-semibold hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
              {mode === "signin" ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
