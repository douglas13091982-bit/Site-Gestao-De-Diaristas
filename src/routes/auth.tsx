import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { useServerFn } from "@tanstack/react-start";
import { toMessage } from "@/shared/lib/result";
import { RoleTabs } from "@/features/auth/login/components/RoleTabs";
import { PasswordSetupCard } from "@/features/auth/login/components/PasswordSetupCard";
import {
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
  const { user, loading, roles } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [role, setRole] = useState<LoginRole>(search.role ?? "client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [legacy, setLegacy] = useState(false);
  const [sending, setSending] = useState(false);
  const sendSetup = useServerFn(sendPasswordSetupEmail);

  useEffect(() => {
    if (loading || !user || busy) return;
    const home = roles.includes("admin") ? "/admin"
      : roles.includes("professional") ? (mode === "signup" ? "/pro/profile" : "/pro")
      : roles.includes("client") ? "/cliente"
      : "/";
    const target = search.redirect ?? home;
    navigate({ to: target as "/" });
  }, [user, loading, roles, navigate, search.redirect, mode, busy]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (! /^(?:55)?[1-9][0-9]9[0-9]{8}$/.test(phone.replace(/\D/g, ""))) {
          throw new Error("Informe um WhatsApp válido com DDD.");
        }
        await signUpAccount({ password, fullName, role, phone: phone.replace(/\D/g, "") });
        toast.success(role === "professional" ? "Conta criada! Confirme seu WhatsApp." : "Conta criada!");
        navigate({ to: role === "professional" ? "/pro/profile" : "/cliente" });
        return;
      } else {
        await signInWithPassword(legacy ? email : phone, password);
      }
    } catch (err) {
      // Mensagem genérica evita enumeração de contas.
      toast.error(
        mode === "signin"
          ? "WhatsApp ou senha inválidos. Para contas antigas, use o acesso por e-mail."
          : toMessage(err, "Não foi possível criar a conta."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordSetup() {
    if (!email) return toast.error("Informe seu e-mail primeiro");
    setSending(true);
    try {
      await requestPasswordSetupEmail(email, sendSetup);
      // Mensagem única, existindo ou não a conta (anti-enumeração).
      toast.success("Se este e-mail estiver cadastrado, enviaremos um link para criar sua senha.");
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
            {(mode === "signup" || !legacy) && (
              <div className="space-y-1">
                <Label htmlFor="signup-phone">WhatsApp com DDD</Label>
                <Input id="signup-phone" type="tel" autoComplete="tel" placeholder="(47) 99999-9999" required value={phone} onChange={e => setPhone(e.target.value)} />
                {mode === "signup" && role === "professional" && <p className="text-xs text-muted-foreground">Confirme seu WhatsApp após entrar.</p>}
              </div>
            )}
            {mode === "signin" && legacy && <div className="space-y-1">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>}
            <div className="space-y-1">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "..." : mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          {mode === "signin" && <button type="button" className="text-sm text-primary" onClick={()=>setLegacy(!legacy)}>{legacy ? "Entrar com WhatsApp" : "Acesso de contas antigas / administrador"}</button>}
          {mode === "signin" && legacy && (
            <PasswordSetupCard
              highlighted={false}
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
