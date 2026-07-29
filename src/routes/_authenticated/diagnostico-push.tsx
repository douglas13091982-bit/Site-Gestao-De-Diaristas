import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { sendPushToUsers } from "@/lib/push.functions";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw, Send, Smartphone, RotateCw, Vibrate } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/diagnostico-push")({
  head: () => ({
    meta: [
      { title: "Diagnóstico de Notificações — Gersepa Solutions" },
      { name: "description", content: "Verifique passo a passo por que as notificações não estão chegando no seu Android/APK." },
    ],
  }),
  component: DiagnosticoPush,
});

type CheckState = "ok" | "warn" | "fail" | "pending";
type Check = { key: string; label: string; state: CheckState; detail?: string; hint?: string };

function StateIcon({ s }: { s: CheckState }) {
  if (s === "ok") return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
  if (s === "fail") return <XCircle className="w-5 h-5 text-rose-600 shrink-0" />;
  if (s === "warn") return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
  return <Loader2 className="w-5 h-5 text-slate-400 shrink-0 animate-spin" />;
}

function detectContext() {
  if (typeof window === "undefined") return { isTwa: false, isStandalone: false, ua: "" };
  const ua = navigator.userAgent || "";
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS
    window.navigator.standalone === true;
  // TWA sets referrer android-app://<package>
  const isTwa = document.referrer.startsWith("android-app://") ||
    /; wv\)/.test(ua) === false && isStandalone && /Android/i.test(ua);
  return { isTwa, isStandalone, ua };
}

function DiagnosticoPush() {
  const { user } = useAuth();
  const push = usePushNotifications();
  const sendPush = useServerFn(sendPushToUsers);
  const [checks, setChecks] = useState<Check[]>([]);
  const [busy, setBusy] = useState(false);
  const [assetlinksOk, setAssetlinksOk] = useState<CheckState>("pending");
  const [tokenRow, setTokenRow] = useState<{ endpoint: string; updated_at: string } | null>(null);

  const runChecks = useCallback(async () => {
    setBusy(true);
    const list: Check[] = [];
    const ctx = detectContext();

    // 1) Ambiente
    list.push({
      key: "env",
      label: "Ambiente de execução",
      state: ctx.isTwa ? "ok" : ctx.isStandalone ? "warn" : "warn",
      detail: ctx.isTwa ? "APK TWA detectado" : ctx.isStandalone ? "PWA instalada (não é TWA)" : "Navegador comum",
      hint: !ctx.isTwa && !ctx.isStandalone
        ? "Instale o APK ou a PWA — em aba comum o Android nem sempre entrega push em segundo plano."
        : undefined,
    });

    // 2) Suporte a Notification API
    const supported = typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
    list.push({
      key: "support",
      label: "Navegador suporta push (FCM)",
      state: supported ? "ok" : "fail",
      hint: !supported ? "Este WebView não suporta push. Use Chrome ou APK TWA gerado com 'Notification delegation'." : undefined,
    });

    // 3) Permissão
    const perm = supported ? Notification.permission : "denied";
    list.push({
      key: "perm",
      label: "Permissão de notificação",
      state: perm === "granted" ? "ok" : perm === "denied" ? "fail" : "warn",
      detail: `Notification.permission = "${perm}"`,
      hint: perm === "denied"
        ? "No Android: segure o ícone do app → Informações → Notificações → Permitir. Depois toque em 'Reexecutar diagnóstico'."
        : perm === "default"
        ? "Toque em 'Ativar notificações' abaixo para pedir a permissão."
        : undefined,
    });

    // 4) Service Worker registrado
    let swOk: CheckState = "fail";
    let swDetail = "";
    if (supported) {
      const regs = await navigator.serviceWorker.getRegistrations();
      const fcmReg = regs.find((r) => r.active?.scriptURL.includes("firebase-messaging-sw"));
      if (fcmReg) {
        swOk = "ok";
        swDetail = "firebase-messaging-sw.js ativo";
      } else if (regs.length) {
        swOk = "warn";
        swDetail = `${regs.length} SW ativo(s), mas nenhum é o FCM`;
      } else {
        swDetail = "Nenhum service worker registrado";
      }
    }
    list.push({
      key: "sw",
      label: "Service Worker do Firebase",
      state: swOk,
      detail: swDetail,
      hint: swOk !== "ok" ? "Ative as notificações abaixo — isso registra o service worker automaticamente." : undefined,
    });

    // 5) Token FCM salvo no banco
    let tokenState: CheckState = "fail";
    let tokenDetail = "Nenhum token salvo para esta conta";
    if (user) {
      const { data } = await supabase
        .from("push_subscriptions")
        .select("endpoint, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.endpoint) {
        setTokenRow({ endpoint: data.endpoint, updated_at: data.updated_at });
        tokenState = "ok";
        tokenDetail = `Token: ${data.endpoint.slice(0, 24)}…${data.endpoint.slice(-6)}`;
      } else {
        setTokenRow(null);
      }
    }
    list.push({
      key: "token",
      label: "Token FCM salvo no banco",
      state: tokenState,
      detail: tokenDetail,
      hint: tokenState !== "ok" ? "Toque em 'Ativar notificações' para gerar e salvar o token." : undefined,
    });

    // 5b) Vibração
    const canVibrate = typeof navigator !== "undefined" && "vibrate" in navigator;
    list.push({
      key: "vibrate",
      label: "Vibração do aparelho",
      state: canVibrate ? "ok" : "warn",
      detail: canVibrate ? "API de vibração disponível" : "Este dispositivo/navegador não expõe a API de vibração",
      hint: canVibrate
        ? "Toque em 'Testar vibração' abaixo. Se não vibrar, verifique o modo silencioso e as vibrações do Android."
        : "No iPhone a vibração do push é controlada pelo próprio iOS. No Android use Chrome ou o APK TWA.",
    });

    // 6) assetlinks.json (só faz diferença para TWA)
    try {
      const res = await fetch("/.well-known/assetlinks.json", { cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        const sha = j?.[0]?.target?.sha256_cert_fingerprints?.[0];
        setAssetlinksOk("ok");
        list.push({
          key: "assetlinks",
          label: "Digital Asset Links publicado",
          state: "ok",
          detail: sha ? `SHA-256: ${sha.slice(0, 20)}…` : "assetlinks.json acessível",
        });
      } else {
        setAssetlinksOk("fail");
        list.push({ key: "assetlinks", label: "Digital Asset Links publicado", state: "fail", detail: `HTTP ${res.status}` });
      }
    } catch (e) {
      setAssetlinksOk("warn");
      list.push({ key: "assetlinks", label: "Digital Asset Links publicado", state: "warn", detail: "Falha ao consultar" });
    }

    setChecks(list);
    setBusy(false);
  }, [user]);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  const sendSelfTest = useCallback(async () => {
    if (!user) return;
    try {
      const r = await sendPush({
        data: {
          userIds: [user.id],
          title: "Teste de notificação",
          body: "Se você recebeu isto, o push está funcionando neste dispositivo.",
          link: "/notificacoes",
        },
      });
      if (r.sent > 0) toast.success(`Push enviado para ${r.sent} dispositivo(s). Verifique agora.`);
      else toast.error(`Nenhum dispositivo recebeu. Falhas: ${r.failed}. Ative as notificações e reexecute.`);
    } catch (e) {
      toast.error("Falha ao disparar teste. Tente reexecutar o diagnóstico.");
    }
  }, [sendPush, user]);

  const canTest = checks.find((c) => c.key === "token")?.state === "ok";

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Smartphone className="w-4 h-4" /> Android / APK TWA
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Diagnóstico de notificações</h1>
            <p className="text-slate-600 text-sm mt-1">
              Verificamos cada camada necessária para o push chegar no seu celular.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={runChecks} disabled={busy}>
            <RefreshCw className={`w-4 h-4 mr-2 ${busy ? "animate-spin" : ""}`} /> Reexecutar
          </Button>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white divide-y">
          {checks.map((c) => (
            <div key={c.key} className="p-4 flex items-start gap-3">
              <StateIcon s={c.state} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">{c.label}</p>
                {c.detail && <p className="text-sm text-slate-500 mt-0.5 break-all">{c.detail}</p>}
                {c.hint && <p className="text-sm text-amber-700 mt-1">{c.hint}</p>}
              </div>
            </div>
          ))}
          {!checks.length && <div className="p-6 text-center text-slate-500 text-sm">Rodando verificações…</div>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="font-semibold text-slate-900">Ações</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={push.enable}
              disabled={push.busy || push.status === "granted"}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {push.status === "granted" ? "Notificações ativas" : "Ativar notificações"}
            </Button>
            <Button
              onClick={async () => {
                const ok = await push.registerDevice();
                if (ok) await runChecks();
              }}
              disabled={push.busy || busy}
              variant="secondary"
            >
              <RotateCw className={`w-4 h-4 mr-2 ${push.busy ? "animate-spin" : ""}`} /> Registrar este dispositivo novamente
            </Button>
            <Button onClick={sendSelfTest} disabled={!canTest} variant="outline">
              <Send className="w-4 h-4 mr-2" /> Enviar teste para meu celular
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const ok = typeof navigator !== "undefined" && "vibrate" in navigator
                  ? navigator.vibrate([300, 120, 300, 120, 400])
                  : false;
                if (ok) toast.success("Comando de vibração enviado. Sentiu o celular vibrar?");
                else toast.error("Este dispositivo não permitiu vibrar (verifique modo silencioso ou suporte do navegador).");
              }}
            >
              <Vibrate className="w-4 h-4 mr-2" /> Testar vibração
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const reg =
                    (await navigator.serviceWorker?.getRegistration("/firebase-messaging-sw.js")) ||
                    (await navigator.serviceWorker?.ready);
                  if (!reg) {
                    toast.error("Service worker não encontrado neste dispositivo.");
                    return;
                  }
                  await reg.showNotification("Gersepa Solutions", {
                    body: "Teste de notificação com vibração.",
                    icon: "/icons/icon-192.png",
                    badge: "/icons/badge-96-v3.png",
                    tag: "gersepa-push",
                    renotify: true,
                    silent: false,
                    vibrate: [300, 120, 300, 120, 400],
                    data: { url: "/diagnostico-push" },
                  } as NotificationOptions);
                  toast.success("Notificação exibida. Vibrou? Se não, o canal de notificação do Android está sem vibração.");
                } catch (e) {
                  toast.error("Não foi possível exibir a notificação de teste.");
                }
              }}
            >
              <Vibrate className="w-4 h-4 mr-2" /> Testar notificação + vibração
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Se “Testar vibração” funciona mas “Testar notificação + vibração” (ou o push real) não vibra, o problema é o
            <b> canal de notificação do Android</b>, que ignora o padrão enviado pelo site. Corrija em: Configurações → Apps →
            Gersepa → Notificações → (canal padrão) → <b>Vibração: ativada</b> e Importância <b>Alta</b>. No modo silencioso/
            “Não perturbe” a vibração também é bloqueada.
          </p>
          <p className="text-xs text-slate-500">
            Use “Registrar este dispositivo novamente” se a permissão já estiver concedida mas o token não aparecer salvo,
            ou se você ativou as notificações em outra conta neste mesmo celular.
          </p>
          {tokenRow && (
            <p className="text-xs text-slate-500">
              Último token atualizado em {new Date(tokenRow.updated_at).toLocaleString("pt-BR")}.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
          <h2 className="font-semibold text-slate-900">Se algo continuar falhando</h2>
          <ol className="list-decimal list-inside space-y-1">
            <li>Confirme que o APK foi gerado com <b>Notification delegation</b> ativado no PWABuilder.</li>
            <li>Desinstale o APK antigo antes de instalar o novo (mudança de assinatura bloqueia update).</li>
            <li>No Android, abra Configurações → Apps → Gersepa → Notificações e permita.</li>
            <li>Confirme que o <code>assetlinks.json</code> tem a mesma SHA-256 da chave usada para assinar o APK.</li>
            <li>Force o encerramento do app e abra de novo; toque em <b>Reexecutar</b> acima.</li>
          </ol>
          <p className="pt-2">
            <Link to="/notificacoes" className="text-emerald-700 underline">Ver central de notificações →</Link>
          </p>
        </section>
      </main>
    </>
  );
}
