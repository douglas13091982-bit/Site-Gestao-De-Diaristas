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

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
  role: z.enum(["client", "worker"]).optional(),
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
  const [role, setRole] = useState<"client" | "worker">(search.role ?? "client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: (search.redirect as "/dashboard") ?? "/dashboard" });
  }, [user, loading, navigate, search.redirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
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
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally { setBusy(false); }
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
              <button type="button" onClick={() => setRole("worker")} className={`py-2.5 rounded-lg text-sm font-semibold transition ${role === "worker" ? "bg-background shadow" : "text-muted-foreground"}`}>
                Sou diarista
              </button>
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={google}>Continuar com Google</Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-card px-3 text-xs uppercase text-muted-foreground">ou</span></div>
          </div>

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
