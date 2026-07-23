import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Upload, Loader2 } from "lucide-react";
import { compressImage } from "@/lib/image-utils";

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
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const profile = useQuery({
    enabled: !!user,
    queryKey: ["cliente-perfil", user?.id],
    queryFn: async () => (await supabase.from("profiles")
      .select("full_name,phone,cpf,city,address,address_number,address_complement,address_neighborhood,property_type,email,profile_photo")
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
      setPhoto(profile.data.profile_photo ?? null);
    }
  }, [profile.data]);

  const set = <K extends keyof Form>(k: K) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function uploadPhoto(input: File) {
    if (!user) return;
    if (input.size > 10 * 1024 * 1024) return toast.error("Foto muito grande. Máximo 10 MB.");
    setUploading(true);
    try {
      const file = await compressImage(input, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 });
      const path = `${user.id}/avatar-${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage.from("professional-photos").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage.from("professional-photos").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (sErr) throw sErr;
      const url = signed.signedUrl;
      const { error: updErr } = await supabase.from("profiles").update({ profile_photo: url }).eq("id", user.id);
      if (updErr) throw updErr;
      setPhoto(url);
      qc.invalidateQueries();
      toast.success("Foto atualizada!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

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
      <section className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-bold text-lg mb-4">Foto de perfil</h2>
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 rounded-full overflow-hidden bg-muted border shrink-0">
            {photo ? (
              <img src={photo} alt="Foto" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-2xl font-semibold text-muted-foreground">
                {(form.full_name || user?.email || "?").charAt(0).toUpperCase()}
              </div>
            )}
            {uploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-white" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              <input ref={camRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-xs font-semibold">
                <Upload className="h-4 w-4" /> Enviar foto
              </button>
              <button type="button" disabled={uploading} onClick={() => camRef.current?.click()} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-xs font-semibold">
                <Camera className="h-4 w-4" /> Tirar foto
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">JPG ou PNG, até 5 MB.</p>
          </div>
        </div>
      </section>

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

type FieldProps = { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">;
function Field({ label, value, onChange, ...rest }: FieldProps) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full h-11 rounded-md border border-input bg-background px-3 text-sm" />
    </div>
  );
}