import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CreditCard, Save, Key, Webhook, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

type Settings = {
  payment_platform: string;
  pix_key: string;
  pix_key_type: string;
  pix_beneficiary_name: string;
  pix_qr_url: string;
  mp_access_token: string;
  mp_public_key: string;
  mp_webhook_secret: string;
  mp_environment: string;
  ps_email: string;
  ps_token: string;
  ps_environment: string;
};

const DEFAULTS: Settings = {
  payment_platform: "mercadopago",
  pix_key: "",
  pix_key_type: "email",
  pix_beneficiary_name: "",
  pix_qr_url: "",
  mp_access_token: "",
  mp_public_key: "",
  mp_webhook_secret: "",
  mp_environment: "sandbox",
  ps_email: "",
  ps_token: "",
  ps_environment: "sandbox",
};

const META: Record<keyof Settings, { group: string; type: string; public: boolean; label: string }> = {
  payment_platform: { group: "payment", type: "text", public: false, label: "Plataforma de Pagamento" },
  pix_key: { group: "payment", type: "text", public: false, label: "Chave PIX" },
  pix_key_type: { group: "payment", type: "text", public: false, label: "Tipo da Chave PIX" },
  pix_beneficiary_name: { group: "payment", type: "text", public: false, label: "Nome do Beneficiário" },
  pix_qr_url: { group: "payment", type: "text", public: false, label: "URL do QR Code PIX" },
  mp_access_token: { group: "payment", type: "text", public: false, label: "Mercado Pago - Access Token" },
  mp_public_key: { group: "payment", type: "text", public: true, label: "Mercado Pago - Public Key" },
  mp_webhook_secret: { group: "payment", type: "text", public: false, label: "Mercado Pago - Webhook Secret" },
  mp_environment: { group: "payment", type: "text", public: false, label: "Mercado Pago - Ambiente" },
  ps_email: { group: "payment", type: "text", public: false, label: "PagSeguro - Email" },
  ps_token: { group: "payment", type: "text", public: false, label: "PagSeguro - Token" },
  ps_environment: { group: "payment", type: "text", public: false, label: "PagSeguro - Ambiente" },
};

const PLATFORMS = [
  { id: "mercadopago", name: "Mercado Pago", desc: "PIX automático" },
  { id: "pagseguro", name: "PagSeguro", desc: "PIX automático" },
  { id: "pix_manual", name: "PIX Manual", desc: "QR Code estático" },
];

const KEY_TYPES = [
  { id: "email", name: "Email" },
  { id: "cpf", name: "CPF" },
  { id: "cnpj", name: "CNPJ" },
  { id: "phone", name: "Telefone" },
  { id: "random", name: "Chave Aleatória" },
];

function SettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [showSecrets, setShowSecrets] = useState(false);

  const q = useQuery({
    queryKey: ["admin-settings"],
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
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof Settings>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const platformDesc =
    form.payment_platform === "mercadopago"
      ? "Os créditos serão liberados automaticamente quando o pagamento for confirmado pelo Mercado Pago."
      : form.payment_platform === "pagseguro"
      ? "Os créditos serão liberados automaticamente quando o pagamento for confirmado pelo PagSeguro."
      : "O cliente pagará via QR Code PIX. Os créditos precisam ser liberados manualmente após confirmação do pagamento.";

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <AdminPageHeader
          title="Configurações"
          subtitle="Configurar integrações de pagamento e parâmetros do sistema"
        />
        <button
          onClick={() => saveMut.mutate(form)}
          disabled={saveMut.isPending}
          className="h-11 px-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saveMut.isPending ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-5 text-slate-800">
          <CreditCard className="h-5 w-5 text-emerald-600" />
          <h3 className="font-semibold">Configurações de Pagamento</h3>
        </div>

        <div className="mb-2 text-sm font-medium text-slate-700">Plataforma de Pagamento Ativa</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PLATFORMS.map((p) => {
            const active = form.payment_platform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => set("payment_platform", p.id)}
                className={`text-center rounded-lg border p-4 transition ${
                  active
                    ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className={`text-sm font-semibold ${active ? "text-emerald-700" : "text-slate-800"}`}>
                  {p.name}
                </div>
                <div className="text-xs text-slate-500 mt-1">{p.desc}</div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-3">{platformDesc}</p>

        <div className="border-t border-slate-100 mt-6 pt-6">
          <div className="text-sm font-semibold text-slate-800 mb-4">PIX Manual (Fallback)</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Chave PIX">
              <TextInput value={form.pix_key} onChange={(v) => set("pix_key", v)} />
            </Field>
            <Field label="Tipo da Chave">
              <select
                value={form.pix_key_type}
                onChange={(e) => set("pix_key_type", e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {KEY_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Nome do Beneficiário" className="md:col-span-2">
              <TextInput value={form.pix_beneficiary_name} onChange={(v) => set("pix_beneficiary_name", v)} />
            </Field>
            <Field label="URL da Imagem do QR Code PIX" className="md:col-span-2">
              <TextInput value={form.pix_qr_url} onChange={(v) => set("pix_qr_url", v)} placeholder="https://..." />
            </Field>
          </div>
          {form.pix_qr_url && (
            <div className="mt-4">
              <div className="h-32 w-32 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                <img src={form.pix_qr_url} alt="QR Code PIX" className="max-h-full max-w-full object-contain" />
              </div>
            </div>
          )}
        </div>
      </section>

      {form.payment_platform === "mercadopago" && (
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 text-slate-800">
              <Key className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold">Credenciais Mercado Pago</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowSecrets((s) => !s)}
              className="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
            >
              {showSecrets ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showSecrets ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Ambiente">
              <select
                value={form.mp_environment}
                onChange={(e) => set("mp_environment", e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="sandbox">Sandbox (Teste)</option>
                <option value="production">Produção</option>
              </select>
            </Field>
            <Field label="Public Key">
              <TextInput value={form.mp_public_key} onChange={(v) => set("mp_public_key", v)} placeholder="APP_USR-..." />
            </Field>
            <Field label="Access Token" className="md:col-span-2">
              <TextInput
                value={form.mp_access_token}
                onChange={(v) => set("mp_access_token", v)}
                placeholder="APP_USR-..."
                type={showSecrets ? "text" : "password"}
              />
            </Field>
            <Field label="Webhook Secret" className="md:col-span-2">
              <TextInput
                value={form.mp_webhook_secret}
                onChange={(v) => set("mp_webhook_secret", v)}
                placeholder="Chave para validar assinatura do webhook"
                type={showSecrets ? "text" : "password"}
              />
            </Field>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800">
            <Webhook className="h-4 w-4 mt-0.5" />
            <div>
              URL do Webhook: <code className="font-mono">/api/public/webhooks/mercadopago</code> — configure no painel do Mercado Pago para receber confirmações de pagamento.
            </div>
          </div>
        </section>
      )}

      {form.payment_platform === "pagseguro" && (
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 text-slate-800">
              <Key className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold">Credenciais PagSeguro</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowSecrets((s) => !s)}
              className="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
            >
              {showSecrets ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showSecrets ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Ambiente">
              <select
                value={form.ps_environment}
                onChange={(e) => set("ps_environment", e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="sandbox">Sandbox (Teste)</option>
                <option value="production">Produção</option>
              </select>
            </Field>
            <Field label="Email da Conta">
              <TextInput value={form.ps_email} onChange={(v) => set("ps_email", v)} placeholder="conta@empresa.com" />
            </Field>
            <Field label="Token" className="md:col-span-2">
              <TextInput
                value={form.ps_token}
                onChange={(v) => set("ps_token", v)}
                placeholder="Token de integração PagSeguro"
                type={showSecrets ? "text" : "password"}
              />
            </Field>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800">
            <Webhook className="h-4 w-4 mt-0.5" />
            <div>
              URL de Notificação: <code className="font-mono">/api/public/webhooks/pagseguro</code> — configure em Integrações → Notificações no painel do PagSeguro.
            </div>
          </div>
        </section>
      )}
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