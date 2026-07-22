import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [
    { title: "Complete seu perfil — Gersepa Solutions" },
    { name: "description", content: "Complete seu cadastro no Gersepa Solutions." },
    { property: "og:title", content: "Onboarding — Gersepa Solutions" },
    { property: "og:description", content: "Cadastro rápido no Gersepa Solutions." },
  ] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, roles } = useAuth();
  const nav = useNavigate();
  const isWorker = roles.includes("worker");
  const [form, setForm] = useState({ full_name: "", phone: "", city: "", state: "", address: "", bio: "", service_radius_km: 10 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setForm((f) => ({
        ...f,
        full_name: data.full_name ?? "",
        phone: data.phone ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        address: data.address ?? "",
        bio: data.bio ?? "",
        service_radius_km: data.service_radius_km ?? 10,
      }));
      if (data?.onboarding_completed) nav({ to: "/dashboard" });
    });
  }, [user, nav]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: form.full_name,
        phone: form.phone,
        city: form.city,
        state: form.state,
        address: form.address,
        bio: form.bio,
        service_radius_km: form.service_radius_km,
        onboarding_completed: true,
      }).eq("id", user.id);
      if (error) throw error;
      toast.success("Perfil salvo!");
      nav({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Complete seu perfil</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isWorker ? "Como diarista, esses dados ficam visíveis para clientes." : "Ajuda a encontrar diaristas próximas."}
            </p>
          </div>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1">
              <Label>Nome completo</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1"><Label>Cidade</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></div>
            </div>
            <div className="grid sm:grid-cols-[80px_1fr] gap-3">
              <div className="space-y-1"><Label>UF</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase().slice(0,2) })} maxLength={2} /></div>
              <div className="space-y-1"><Label>Endereço</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            </div>
            {isWorker && (
              <>
              <div className="space-y-1"><Label>Bio</Label><Textarea rows={4} value={form.bio} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, bio: e.target.value })} placeholder="Conte sobre sua experiência…" /></div>
                <div className="space-y-1"><Label>Raio de atendimento (km)</Label><Input type="number" min={1} max={100} value={form.service_radius_km} onChange={(e) => setForm({ ...form, service_radius_km: Number(e.target.value) })} /></div>
              </>
            )}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvando…" : "Salvar e continuar"}</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
