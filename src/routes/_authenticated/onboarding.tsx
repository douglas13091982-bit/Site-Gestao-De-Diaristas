import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Cadastro da diarista — Gersepa Solutions" },
      { name: "description", content: "Complete seu cadastro profissional na Gersepa Solutions." },
      { property: "og:title", content: "Cadastro profissional — Gersepa Solutions" },
      { property: "og:description", content: "Wizard de cadastro para diaristas." },
    ],
  }),
  component: OnboardingPage,
});

const STEPS = ["Pessoal", "Endereço", "Profissional", "Atendimento", "Agenda"] as const;
const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function OnboardingPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cities = useQuery({
    queryKey: ["cities-enabled"],
    queryFn: async () =>
      (await supabase.from("available_cities").select("slug,name,state").eq("is_enabled", true).order("name")).data ?? [],
  });

  const [f, setF] = useState({
    full_name: "",
    phone: "",
    cpf: "",
    address: "",
    address_number: "",
    address_neighborhood: "",
    city_slug: "",
    bio: "",
    experience: "",
    hourly_rate: "35",
    specialties: "",
    profile_photo: "",
    pix_key: "",
    pix_key_type: "cpf",
  });
  const [avail, setAvail] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true, 4: true, 5: true });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setF((p) => ({
          ...p,
          full_name: data.full_name ?? p.full_name,
          phone: data.phone ?? "",
          cpf: data.cpf ?? "",
          address: data.address ?? "",
          address_number: data.address_number ?? "",
          address_neighborhood: data.address_neighborhood ?? "",
          city_slug: data.city_slug ?? "",
          bio: data.bio ?? "",
          experience: data.experience ?? "",
          hourly_rate: data.hourly_rate?.toString() ?? "35",
          specialties: (data.specialties ?? []).join(", "),
          profile_photo: data.profile_photo ?? "",
          pix_key: data.pix_key ?? "",
          pix_key_type: data.pix_key_type ?? "cpf",
        }));
      }
    });
  }, [user]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function finish() {
    if (!user) return;
    setSaving(true); setError(null);
    const cityName = cities.data?.find((c) => c.slug === f.city_slug)?.name ?? null;
    const { error: perr } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name: f.full_name,
      phone: f.phone,
      cpf: f.cpf,
      address: f.address,
      address_number: f.address_number,
      address_neighborhood: f.address_neighborhood,
      city: cityName,
      city_slug: f.city_slug || null,
      bio: f.bio,
      experience: f.experience,
      hourly_rate: Number(f.hourly_rate) || null,
      specialties: f.specialties.split(",").map((s) => s.trim()).filter(Boolean),
      profile_photo: f.profile_photo || null,
      pix_key: f.pix_key || null,
      pix_key_type: f.pix_key_type,
      is_professional: true,
      is_available: true,
    });
    if (perr) { setError(perr.message); setSaving(false); return; }

    await supabase.from("user_roles").upsert({ user_id: user.id, role: "worker" as never }, { onConflict: "user_id,role" as never });

    // reset availability
    await supabase.from("professional_availability").delete().eq("professional_id", user.id);
    const rows = Object.entries(avail).filter(([, v]) => v).map(([d]) => ({
      professional_id: user.id, day_of_week: Number(d), start_time: "08:00", end_time: "18:00", is_available: true,
    }));
    if (rows.length) await supabase.from("professional_availability").insert(rows);

    qc.invalidateQueries();
    setSaving(false);
    nav({ to: "/pro/leads" });
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold">Cadastro profissional</h1>
        <p className="text-muted-foreground mt-1">Complete as etapas para começar a receber leads.</p>

        <div className="mt-6 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-2 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
              <div className={`text-xs mt-1 ${i === step ? "text-primary font-semibold" : "text-muted-foreground"}`}>{i + 1}. {s}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border bg-card p-6 space-y-4">
          {step === 0 && (
            <>
              <Field label="Nome completo"><Input value={f.full_name} onChange={set("full_name")} /></Field>
              <Field label="Telefone / WhatsApp"><Input value={f.phone} onChange={set("phone")} placeholder="(47) 99999-9999" /></Field>
              <Field label="CPF"><Input value={f.cpf} onChange={set("cpf")} placeholder="000.000.000-00" /></Field>
              <Field label="Foto de perfil (URL)"><Input value={f.profile_photo} onChange={set("profile_photo")} placeholder="https://..." /></Field>
            </>
          )}
          {step === 1 && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><Field label="Endereço"><Input value={f.address} onChange={set("address")} /></Field></div>
                <Field label="Número"><Input value={f.address_number} onChange={set("address_number")} /></Field>
              </div>
              <Field label="Bairro"><Input value={f.address_neighborhood} onChange={set("address_neighborhood")} /></Field>
              <Field label="Cidade">
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={f.city_slug} onChange={set("city_slug")}>
                  <option value="">Selecione…</option>
                  {cities.data?.map((c) => <option key={c.slug} value={c.slug}>{c.name} — {c.state}</option>)}
                </select>
              </Field>
            </>
          )}
          {step === 2 && (
            <>
              <Field label="Bio (apresentação curta)"><Textarea rows={4} value={f.bio} onChange={set("bio")} /></Field>
              <Field label="Experiência"><Textarea rows={3} value={f.experience} onChange={set("experience")} placeholder="Ex.: 5 anos em residências e escritórios" /></Field>
              <Field label="Valor por hora (R$)"><Input type="number" value={f.hourly_rate} onChange={set("hourly_rate")} /></Field>
              <Field label="Especialidades (separadas por vírgula)"><Input value={f.specialties} onChange={set("specialties")} placeholder="Faxina pesada, passadoria, cozinha" /></Field>
            </>
          )}
          {step === 3 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo de chave PIX">
                  <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={f.pix_key_type} onChange={set("pix_key_type")}>
                    <option value="cpf">CPF</option>
                    <option value="email">E-mail</option>
                    <option value="phone">Telefone</option>
                    <option value="random">Aleatória</option>
                  </select>
                </Field>
                <Field label="Chave PIX"><Input value={f.pix_key} onChange={set("pix_key")} /></Field>
              </div>
              <p className="text-sm text-muted-foreground">Sua chave PIX é usada para receber os pagamentos dos serviços aceitos.</p>
            </>
          )}
          {step === 4 && (
            <>
              <Label>Dias em que você atende (horário padrão 08:00 – 18:00)</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {DAYS.map((d, i) => (
                  <label key={d} className="flex items-center gap-2 rounded-md border p-3 cursor-pointer">
                    <input type="checkbox" checked={!!avail[i]} onChange={(e) => setAvail((p) => ({ ...p, [i]: e.target.checked }))} />
                    <span>{d}</span>
                  </label>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">Você poderá ajustar horários e bloquear datas específicas depois.</p>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Voltar</Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)}>Continuar</Button>
            ) : (
              <Button onClick={finish} disabled={saving}>{saving ? "Salvando…" : "Concluir cadastro"}</Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}