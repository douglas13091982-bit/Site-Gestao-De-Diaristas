import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cliente/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil — Gersepa" }, { name: "description", content: "Atualize seus dados." }] }),
  component: ClientePerfil,
});

type Form = {
  full_name: string; phone: string; cpf: string;
  city: string; address: string; address_number: string;
  address_complement: string; address_neighborhood: string; property_type: string;
};

const EMPTY: Form = { full_name: "", phone: "", cpf: "", city: "", address: "", address_number: "", address_complement: "", address_neighborhood: "", property_type: "" };

function ClientePerfil() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);

  const profile = useQuery({
    enabled: !!user,
    queryKey: ["cliente-perfil", user?.id],
    queryFn: async () => (await supabase.from("profiles")
      .select("full_name,phone,cpf,city,address,address_number,address_complement,address_neighborhood,property_type,email")
      .eq("id", user!.id).maybeSingle()).data,
  });

  useEffect(() => {
    if (profile.data) {
      setForm({
        full_name: profile.data.full_name ?? "",
        phone: profile.data.phone ?? "",
        cpf: profile.data.cpf ?? "",
        city: profile.data.city ?? "",
        address: profile.data.address ?? "",
        address_number: profile.data.address_number ?? "",
        address_complement: profile.data.address_complement ?? "",
        address_neighborhood: profile.data.address_neighborhood ?? "",
        property_type: profile.data.property_type ?? "",
      });
    }
  }, [profile.data]);

  const set = <K extends keyof Form>(k: K) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error("Erro ao salvar: " + error.message);
    toast.success("Perfil atualizado");
    qc.invalidateQueries({ queryKey: ["cliente-perfil"] });
    qc.invalidateQueries({ queryKey: ["me-client-profile"] });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  if (profile.isLoading) return <div className="text-muted-foreground">Carregando…</div>;

  return (
    <form onSubmit={save} className="space-y-6 max-w-2xl">
      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-lg">Dados pessoais</h2>
        <Field label="Nome completo" value={form.full_name} onChange={set("full_name")} required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Telefone / WhatsApp" value={form.phone} onChange={set("phone")} placeholder="(47) 99999-9999" />
          <Field label="CPF" value={form.cpf} onChange={set("cpf")} placeholder="Somente números" />
        </div>
        <div className="text-xs text-muted-foreground">E-mail: {profile.data?.email}</div>
      </section>

      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-lg">Endereço padrão</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Cidade" value={form.city} onChange={set("city")} />
          <div>
            <label className="text-sm font-medium">Tipo de imóvel</label>
            <select value={form.property_type} onChange={(e) => set("property_type")(e.target.value)} className="mt-1 w-full h-11 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Selecione</option>
              <option value="apartamento">Apartamento</option>
              <option value="casa">Casa</option>
              <option value="comercial">Comercial</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-4">
          <Field label="Endereço (rua)" value={form.address} onChange={set("address")} />
          <Field label="Número" value={form.address_number} onChange={set("address_number")} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Bairro" value={form.address_neighborhood} onChange={set("address_neighborhood")} />
          <Field label="Complemento" value={form.address_complement} onChange={set("address_complement")} />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="h-11 px-6 rounded-md bg-primary text-primary-foreground font-semibold disabled:opacity-60">
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
        <button type="button" onClick={signOut} className="h-11 px-4 rounded-md border border-border text-sm font-semibold">
          Sair da conta
        </button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full h-11 rounded-md border border-input bg-background px-3 text-sm" />
    </div>
  );
}