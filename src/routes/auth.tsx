import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { useServerFn } from "@tanstack/react-start";
import { checkEmailRegistered, sendPasswordSetupEmail } from "@/lib/account.functions";

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
  const [role, setRole] = useState<"client" | "professional">(search.role ?? "client");
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
        // Se já existe conta com esse e-mail (ex: diarista importada), oferecer criação de senha
        const check = await checkEmail({ data: { email } });
        if (check.exists) {
          setNeedsSetup(true);
          setMode("signin");
          toast.info("Este e-mail já está cadastrado. Crie sua senha para entrar.");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
            data: { full_name: fullName, role },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Complete seu perfil.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          // Credenciais inválidas: verifica se é conta importada sem senha definida
          const msg = error.message.toLowerCase();
          if (msg.includes("invalid") || msg.includes("credentials")) {
            const check = await checkEmail({ data: { email } });
            if (check.exists) {
              setNeedsSetup(true);
              toast.info("Detectamos seu cadastro. Crie sua senha para acessar.");
              return;
            }
          }
          throw error;
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally { setBusy(false); }
  }

  async function requestPasswordSetup() {
    if (!email) return toast.error("Informe seu e-mail primeiro");
    setSending(true);
    try {
      const check = await checkEmail({ data: { email } });
      if (!check.exists) {
        toast.error("Não encontramos cadastro com este e-mail. Crie uma conta.");
        setMode("signup");
        return;
      }
      await sendSetup({
        data: { email, redirectTo: `${window.location.origin}/reset-password` },
      });
      toast.success("Enviamos um link no seu e-mail para criar sua senha.");
      setNeedsSetup(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar e-mail");
    } finally {
      setSending(false);
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
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="bg-card border border-border rounded-2xl shadow-sm p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{mode === "signin" ? "Entrar" : "Criar conta"}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin" ? "Bem-vinda de volta ao Gersepa Solutions" : "Junte-se ao Gersepa Solutions"}
            </p>
          </div>

          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
              <button type="button" onClick={() => setRole("client")} className={`py-2.5 rounded-lg text-sm font-semibold transition ${role === "client" ? "bg-background shadow" : "text-muted-foreground"}`}>
                Sou cliente
              </button>
              <button type="button" onClick={() => setRole("professional")} className={`py-2.5 rounded-lg text-sm font-semibold transition ${role === "professional" ? "bg-background shadow" : "text-muted-foreground"}`}>
                Sou diarista
              </button>
            </div>
          )}

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
            <div className={`rounded-xl border p-4 text-sm space-y-2 ${needsSetup ? "border-primary bg-primary/5" : "border-border bg-muted/40"}`}>
              <p className="font-medium">
                {needsSetup ? "Primeiro acesso ou esqueceu a senha?" : "Já é cadastrada e não sabe a senha?"}
              </p>
              <p className="text-muted-foreground text-xs">
                Enviaremos um link no seu e-mail para você criar uma nova senha e entrar.
              </p>
              <Button type="button" variant="outline" className="w-full" onClick={requestPasswordSetup} disabled={sending}>
                {sending ? "Enviando..." : "Criar / redefinir senha"}
              </Button>
            </div>
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
