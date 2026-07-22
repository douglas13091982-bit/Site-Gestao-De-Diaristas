import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { Image as ImageIcon, Phone, MessageCircle, Save, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/appearance")({
  component: AppearancePage,
});

type Settings = {
  site_name: string;
  logo_url: string;
  site_tagline: string;
  site_subtitle: string;
  contact_phone: string;
  contact_email: string;
  contact_address: string;
  whatsapp_enabled: string;
  social_whatsapp: string;
};

const DEFAULTS: Settings = {
  site_name: "",
  logo_url: "",
  site_tagline: "",
  site_subtitle: "",
  contact_phone: "",
  contact_email: "",
  contact_address: "",
  whatsapp_enabled: "0",
  social_whatsapp: "",
};

const META: Record<keyof Settings, { group: string; type: string; public: boolean; label: string }> = {
  site_name: { group: "site", type: "text", public: true, label: "Nome do Site" },
  logo_url: { group: "site", type: "text", public: true, label: "URL da Logo" },
  site_tagline: { group: "site", type: "text", public: true, label: "Texto Principal (Hero)" },
  site_subtitle: { group: "site", type: "text", public: true, label: "Subtítulo" },
  contact_phone: { group: "contact", type: "text", public: true, label: "Telefone" },
  contact_email: { group: "contact", type: "text", public: true, label: "Email" },
  contact_address: { group: "contact", type: "text", public: true, label: "Endereço" },
  whatsapp_enabled: { group: "social", type: "boolean", public: true, label: "Botão Flutuante WhatsApp" },
  social_whatsapp: { group: "social", type: "text", public: true, label: "Número do WhatsApp" },
};

function AppearancePage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Settings>(DEFAULTS);

  const q = useQuery({
    queryKey: ["admin-appearance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("setting_key, setting_value");
      if (error) throw error;
      const map: Partial<Settings> = {};
      for (const r of data ?? []) {
        if (r.setting_key in DEFAULTS) {
          (map as Record<string, string>)[r.setting_key] = r.setting_value ?? "";
        }
      }
      return { ...DEFAULTS, ...map } as Settings;
    },
  });

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  const saveMut = useMutation({
    mutationFn: async (next: Settings) => {
      const rows = (Object.keys(next) as (keyof Settings)[]).map((k) => ({
        setting_key: k,
        setting_value: next[k] ?? "",
        setting_label: META[k].label,
        setting_type: META[k].type,
        setting_group: META[k].group,
        is_public: META[k].public,
      }));
      const { error } = await supabase
        .from("app_settings")
        .upsert(rows, { onConflict: "setting_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["admin-appearance"] });
      qc.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof Settings>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const waOn = form.whatsapp_enabled === "1" || form.whatsapp_enabled === "true";

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <AdminPageHeader title="Aparência" subtitle="Personalize identidade visual, contato e botões flutuantes" />
        <button
          onClick={() => saveMut.mutate(form)}
          disabled={saveMut.isPending}
          className="h-11 px-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saveMut.isPending ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

      {/* Identidade do Site */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <SectionTitle icon={<ImageIcon className="h-5 w-5 text-emerald-600" />}>Identidade do Site</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nome do Site">
            <TextInput value={form.site_name} onChange={(v) => set("site_name", v)} />
          </Field>
          <Field label="URL da Logo">
            <TextInput value={form.logo_url} onChange={(v) => set("logo_url", v)} placeholder="https://..." />
          </Field>
          <Field label="Texto Principal (Hero)" className="md:col-span-2">
            <TextInput value={form.site_tagline} onChange={(v) => set("site_tagline", v)} />
          </Field>
          <Field label="Subtítulo" className="md:col-span-2">
            <TextInput value={form.site_subtitle} onChange={(v) => set("site_subtitle", v)} />
          </Field>
        </div>
        {form.logo_url && (
          <div className="mt-4">
            <div className="text-xs text-slate-500 mb-2">Preview da Logo:</div>
            <div className="h-14 w-14 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
              <img src={form.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        )}
      </section>

      {/* Contato */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <SectionTitle icon={<Phone className="h-5 w-5 text-emerald-600" />}>Informações de Contato</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Telefone">
            <TextInput value={form.contact_phone} onChange={(v) => set("contact_phone", v)} />
          </Field>
          <Field label="Email">
            <TextInput value={form.contact_email} onChange={(v) => set("contact_email", v)} type="email" />
          </Field>
          <Field label="Endereço" className="md:col-span-2">
            <TextInput value={form.contact_address} onChange={(v) => set("contact_address", v)} />
          </Field>
        </div>
      </section>

      {/* WhatsApp */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <SectionTitle icon={<MessageCircle className="h-5 w-5 text-emerald-600" />}>Botão Flutuante WhatsApp</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Status do Botão">
            <button
              type="button"
              onClick={() => set("whatsapp_enabled", waOn ? "0" : "1")}
              className={`w-full h-11 px-4 rounded-lg border text-sm font-medium inline-flex items-center gap-2 transition ${
                waOn
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              {waOn ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {waOn ? "Ativado" : "Desativado"}
            </button>
            <p className="text-xs text-slate-500 mt-1">Controla a exibição do botão flutuante no canto da tela</p>
          </Field>
          <Field label="Número do WhatsApp">
            <TextInput
              value={form.social_whatsapp}
              onChange={(v) => set("social_whatsapp", v.replace(/\D/g, ""))}
              placeholder="5547999999999"
            />
            <p className="text-xs text-slate-500 mt-1">Formato: 55 + DDD + número (sem espaços)</p>
          </Field>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-5 text-slate-800">
      {icon}
      <h3 className="font-semibold">{children}</h3>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-11 px-4 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
    />
  );
}