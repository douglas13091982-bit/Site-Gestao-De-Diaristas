import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { PasswordChecklist } from "@/shared/components/PasswordChecklist";
import { evaluatePassword } from "@/shared/lib/password-policy";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Criar nova senha — Gersepa Solutions" },
      { name: "description", content: "Defina uma nova senha para acessar sua conta." },
      { property: "og:title", content: "Criar nova senha — Gersepa Solutions" },
      { property: "og:description", content: "Defina sua nova senha de acesso." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery hash and emits PASSWORD_RECOVERY / SIGNED_IN
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
      }
    });
    // Fallback: se já existe sessão ativa quando a página carrega
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!evaluatePassword(password).allPassed) {
      return toast.error(
        "A senha deve ter no mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.",
      );
    }
    if (password !== confirm) return toast.error("As senhas não coincidem");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha criada! Você já está logada.");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar senha");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="bg-card border border-border rounded-2xl shadow-sm p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Criar nova senha</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {ready
                ? "Defina uma senha para acessar sua conta"
                : "Validando link de acesso..."}
            </p>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="password">Nova senha</Label>
              <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} disabled={!ready} autoComplete="new-password" />
              <PasswordChecklist value={password} className="mt-2" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <PasswordInput id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} disabled={!ready} autoComplete="new-password" />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={busy || !ready || !evaluatePassword(password).allPassed || password !== confirm}
            >
              {busy ? "..." : "Salvar senha"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}