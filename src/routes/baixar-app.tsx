import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Download, Smartphone, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";

const searchSchema = z.object({
  next: fallback(z.string(), "").default(""),
  tipo: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/baixar-app")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Baixe o app Gersepa Solutions" },
      { name: "description", content: "Instale o app da Gersepa Solutions no seu celular Android e agende diaristas com um toque." },
      { property: "og:title", content: "Baixe o app Gersepa Solutions" },
      { property: "og:description", content: "App Android oficial para clientes e diaristas." },
    ],
  }),
  component: BaixarAppPage,
});

function BaixarAppPage() {
  const { next, tipo } = Route.useSearch();
  const nav = useNavigate();
  const [apkUrl, setApkUrl] = useState("");
  const [version, setVersion] = useState("");
  const [size, setSize] = useState(0);
  const [playUrl, setPlayUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["apk_url", "apk_version", "apk_size_bytes", "play_store_url"])
      .then(({ data }) => {
        for (const r of data ?? []) {
          if (r.setting_key === "apk_url") setApkUrl(r.setting_value || "");
          if (r.setting_key === "apk_version") setVersion(r.setting_value || "");
          if (r.setting_key === "apk_size_bytes") setSize(Number(r.setting_value) || 0);
          if (r.setting_key === "play_store_url") setPlayUrl(r.setting_value || "");
        }
        setLoading(false);
      });
  }, []);

  const destino = next || (tipo === "professional" ? "/pro" : "/");
  const sizeMb = size ? (size / (1024 * 1024)).toFixed(1) : null;

  function skip() {
    nav({ to: destino as never });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <Header />
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
            <Smartphone className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            {tipo === "professional" ? "Cadastro concluído! Instale o app da diarista" : "Cadastro concluído! Instale o app"}
          </h1>
          <p className="text-slate-600">
            Tenha a Gersepa Solutions sempre à mão. Receba notificações em tempo real e agende com um toque.
          </p>
        </div>

        <div className="mt-8 bg-white rounded-2xl border shadow-sm p-6 space-y-4">
          {loading ? (
            <div className="text-center text-slate-500 py-6">Carregando…</div>
          ) : apkUrl ? (
            <>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <div>
                  <div className="font-semibold">App Gersepa {version && `v${version}`}</div>
                  {sizeMb && <div className="text-sm text-slate-500">{sizeMb} MB • Android</div>}
                </div>
              </div>
              <a href={apkUrl} download>
                <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Download className="w-5 h-5 mr-2" /> Baixar APK
                </Button>
              </a>
              {playUrl && (
                <a href={playUrl} target="_blank" rel="noreferrer" className="block">
                  <Button size="lg" variant="outline" className="w-full">
                    Baixar pela Google Play
                  </Button>
                </a>
              )}
              <div className="text-xs text-slate-500 flex items-start gap-2 pt-2">
                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                <span>Ao instalar, seu Android pode pedir permissão para instalar apps de fora da Play. É seguro: o APK é oficial da Gersepa Solutions.</span>
              </div>
            </>
          ) : playUrl ? (
            <>
              <div className="text-slate-700">O app está disponível na Google Play:</div>
              <a href={playUrl} target="_blank" rel="noreferrer">
                <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Download className="w-5 h-5 mr-2" /> Abrir na Google Play
                </Button>
              </a>
            </>
          ) : (
            <div className="text-center text-slate-500 py-4">
              O APK ainda não está disponível. Você pode continuar usando pelo navegador.
            </div>
          )}

          <button
            type="button"
            onClick={skip}
            className="w-full text-sm text-slate-500 hover:text-slate-700 pt-2 flex items-center justify-center gap-1"
          >
            Continuar sem instalar <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-slate-500">
          Já tem o app instalado? <Link to={destino as never} className="text-emerald-700 underline">Ir para minha área</Link>
        </div>
      </div>
    </div>
  );
}