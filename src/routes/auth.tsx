import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  const [uf, setUf] = useState("");
  const [cityText, setCityText] = useState("");
  const [chosenCity, setChosenCity] = useState("");
  const [showCities, setShowCities] = useState(false);
  const states = useQuery({
    queryKey: ["signup-ibge-states"],
    enabled: mode === "signup" && role === "professional",
    queryFn: async () => {
      const response = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome");
      if (!response.ok) throw new Error("Falha ao carregar estados");
      return await response.json() as Array<{ id: number; sigla: string; nome: string }>;
    },
    staleTime: 86400000,
  });
  const cities = useQuery({
    queryKey: ["signup-ibge-cities", uf],
    enabled: mode === "signup" && role === "professional" && !!uf,
    queryFn: async () => {
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios?orderBy=nome`);
      if (!response.ok) throw new Error("Falha ao carregar municípios");
      return await response.json() as Array<{ id: number; nome: string }>;
    },
    staleTime: 86400000,
  });
  const normalize = (text: string) => text.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase();
  const cityMatches = (cities.data ?? []).filter((city) => normalize(city.nome).includes(normalize(cityText))).slice(0, 40);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const sendSetup = useServerFn(sendPasswordSetupEmail);

  useEffect(() => {
    if (loading || !user) return;
    const isPro = roles.includes("professional");
    const target = search.redirect ?? (isPro ? "/pro" : "/");
    navigate({ to: target as "/" });
  }, [user, loading, roles, navigate, search.redirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (role === "professional" && (!uf || !chosenCity)) {
          throw new Error("Selecione um estado e escolha a cidade nas sugestões.");
        }
        await signUpAccount({ email, password, fullName, role,
          ...(role === "professional" ? { city: chosenCity, state: uf } : {}),
        });
        toast.success("Conta criada! Complete seu perfil.");
        navigate({ to: role === "professional" ? "/pro" : "/" });
        return;
      } else {
        await signInWithPassword(email, password);
      }
    } catch (err) {
      // Mensagem genérica evita enumeração de contas.
      toast.error(
        mode === "signin"
          ? "E-mail ou senha inválidos. Se esqueceu a senha, use 'Criar / redefinir senha'."
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
            {mode === "signup" && role === "professional" && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="signup-state">Estado (UF)</Label>
                  <select id="signup-state" required value={uf}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    onChange={(e) => { setUf(e.target.value); setCityText(""); setChosenCity(""); setShowCities(false); }}>
                    <option value="">Selecione o estado</option>
                    {states.data?.map((state) => <option key={state.id} value={state.sigla}>{state.nome} — {state.sigla}</option>)}
                  </select>
                  {states.isError && <p className="text-xs text-destructive">Não foi possível carregar os estados.</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="signup-city">Cidade</Label>
                  <div className="relative">
                    <Input id="signup-city" role="combobox" aria-expanded={showCities}
                      required disabled={!uf || cities.isLoading}
                      placeholder={!uf ? "Selecione o estado primeiro" : cities.isLoading ? "Carregando municípios…" : "Digite sua cidade"}
                      value={cityText}
                      onFocus={() => setShowCities(true)}
                      onChange={(e) => { setCityText(e.target.value); setChosenCity(""); setShowCities(true); }} />
                    {showCities && !!uf && !cities.isLoading && (
                      <div role="listbox" className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-md border bg-background shadow-lg">
                        {cityMatches.map((city) => (
                          <button type="button" key={city.id} role="option" aria-selected={chosenCity === city.nome}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => { setCityText(city.nome); setChosenCity(city.nome); setShowCities(false); }}>
                            {city.nome}
                          </button>
                        ))}
                        {!cityMatches.length && <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma cidade encontrada.</p>}
                      </div>
                    )}
                  </div>
                  {cities.isError && <p className="text-xs text-destructive">Não foi possível carregar as cidades.</p>}
                  {cityText && !chosenCity && <p className="text-xs text-muted-foreground">Selecione a cidade nas sugestões.</p>}
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "..." : mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          {mode === "signin" && (
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
