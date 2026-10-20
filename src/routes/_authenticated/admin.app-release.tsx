import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Smartphone, Upload, Trash2, ExternalLink, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/app-release")({
  head: () => ({ meta: [{ title: "APK do App — Admin Gersepa" }] }),
  component: AppReleasePage,
});

type Settings = {
  apk_url: string;
  apk_version: string;
  apk_filename: string;
  apk_size_bytes: string;
  apk_updated_at: string;
  play_store_url: string;
};

const DEFAULTS: Settings = {
  apk_url: "",
  apk_version: "",
  apk_filename: "",
  apk_size_bytes: "0",
  apk_updated_at: "",
  play_store_url: "",
};

function formatBytes(n: number) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

async function loadSettings(): Promise<Settings> {
  const keys = Object.keys(DEFAULTS);
  const { data, error } = await supabase
    .from("app_settings")
    .select("setting_key, setting_value")
    .in("setting_key", keys);
  if (error) throw error;
  const map: Settings = { ...DEFAULTS };
  for (const row of data ?? []) {
    (map as Record<string, string>)[row.setting_key] = row.setting_value ?? "";
  }
  return map;
}

async function saveSetting(key: keyof Settings, value: string) {
  const { error } = await supabase
    .from("app_settings")
    .update({ setting_value: value, updated_at: new Date().toISOString() })
    .eq("setting_key", key);
  if (error) throw error;
}

function AppReleasePage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [version, setVersion] = useState("");
  const [playUrl, setPlayUrl] = useState("");

  useEffect(() => {
    loadSettings()
      .then((s) => {
        setSettings(s);
        setVersion(s.apk_version);
        setPlayUrl(s.play_store_url);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpload(file: File) {
    if (!file.name.toLowerCase().endsWith(".apk")) {
      toast.error("Selecione um arquivo .apk");
      return;
    }
    if (!version.trim()) {
      toast.error("Informe a versão antes de enviar");
      return;
    }
    setUploading(true);
    try {
      const safeVersion = version.trim().replace(/[^\w.\-]/g, "_");
      const path = `gersepa-${safeVersion}.apk`;
      const up = await supabase.storage
        .from("apk-releases")
        .upload(path, file, {
          upsert: true,
          contentType: "application/vnd.android.package-archive",
          cacheControl: "3600",
        });
      if (up.error) throw up.error;
      const { data: signed, error: signErr } = await supabase.storage
        .from("apk-releases")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signErr || !signed?.signedUrl) throw signErr ?? new Error("Falha ao gerar link do APK");
      const url = signed.signedUrl;
      const now = new Date().toISOString();
      await Promise.all([
        saveSetting("apk_url", url),
        saveSetting("apk_version", version.trim()),
        saveSetting("apk_filename", path),
        saveSetting("apk_size_bytes", String(file.size)),
        saveSetting("apk_updated_at", now),
      ]);
      setSettings((s) => ({
        ...s,
        apk_url: url,
        apk_version: version.trim(),
        apk_filename: path,
        apk_size_bytes: String(file.size),
        apk_updated_at: now,
      }));
      toast.success("APK publicado com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar APK");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (!settings.apk_filename) return;
    if (!confirm("Remover o APK atual? Usuários não poderão mais baixá-lo.")) return;
    try {
      await supabase.storage.from("apk-releases").remove([settings.apk_filename]);
      await Promise.all([
        saveSetting("apk_url", ""),
        saveSetting("apk_filename", ""),
        saveSetting("apk_size_bytes", "0"),
      ]);
      setSettings((s) => ({ ...s, apk_url: "", apk_filename: "", apk_size_bytes: "0" }));
      toast.success("APK removido");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover");
    }
  }

  async function handleSavePlayUrl() {
    try {
      await saveSetting("play_store_url", playUrl.trim());
      setSettings((s) => ({ ...s, play_store_url: playUrl.trim() }));
      toast.success("Link da Google Play salvo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-emerald-600" />
          Hospedagem do APK
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Envie o APK do app Android (TWA). Ele fica disponível na página <code className="text-emerald-700">/baixar-app</code> e é oferecido automaticamente após cadastro.
        </p>
      </div>

      {loading ? (
        <div className="text-slate-500">Carregando…</div>
      ) : (
        <>
          <section className="bg-white rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold">APK atual</h2>
            {settings.apk_url ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-5 h-5" /> APK publicado
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-slate-500">Versão</dt><dd className="font-medium">{settings.apk_version || "—"}</dd></div>
                  <div><dt className="text-slate-500">Tamanho</dt><dd className="font-medium">{formatBytes(Number(settings.apk_size_bytes) || 0)}</dd></div>
                  <div><dt className="text-slate-500">Arquivo</dt><dd className="font-mono text-xs break-all">{settings.apk_filename}</dd></div>
                  <div><dt className="text-slate-500">Publicado em</dt><dd>{settings.apk_updated_at ? new Date(settings.apk_updated_at).toLocaleString("pt-BR") : "—"}</dd></div>
                </dl>
                <div className="flex flex-wrap gap-2 pt-2">
                  <a href={settings.apk_url} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4 mr-1" /> Abrir link</Button>
                  </a>
                  <Button variant="destructive" size="sm" onClick={handleRemove}>
                    <Trash2 className="w-4 h-4 mr-1" /> Remover
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-sm">Nenhum APK publicado ainda.</div>
            )}
          </section>

          <section className="bg-white rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold">Enviar nova versão</h2>
            <div className="space-y-2">
              <Label htmlFor="version">Versão (ex.: 1.0.3)</Label>
              <Input id="version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apk">Arquivo APK</Label>
              <input
                id="apk"
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
                className="block w-full text-sm border rounded-lg p-2"
              />
              {uploading && <div className="text-sm text-slate-500 flex items-center gap-2"><Upload className="w-4 h-4 animate-pulse" /> Enviando…</div>}
            </div>
          </section>

          <section className="bg-white rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold">Google Play (opcional)</h2>
            <p className="text-sm text-slate-500">Quando o app estiver publicado na Play Store, informe o link. Ele aparece como alternativa na página de download.</p>
            <div className="space-y-2">
              <Label htmlFor="play">URL Google Play</Label>
              <Input id="play" value={playUrl} onChange={(e) => setPlayUrl(e.target.value)} placeholder="https://play.google.com/store/apps/details?id=br.com.gersepa.twa" />
            </div>
            <Button onClick={handleSavePlayUrl}>Salvar link</Button>
          </section>
        </>
      )}
    </div>
  );
}