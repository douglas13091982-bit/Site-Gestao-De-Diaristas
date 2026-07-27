import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/webhooks")({
  component: WebhooksPage,
});

type Event = {
  id: string;
  provider: string;
  event_type: string | null;
  external_id: string | null;
  signature_valid: boolean;
  status: string;
  http_status: number | null;
  payload: unknown;
  headers: unknown;
  error: string | null;
  created_at: string;
};

function WebhooksPage() {
  const qc = useQueryClient();
  const [provider, setProvider] = useState<"all" | "mercadopago" | "pagseguro">("all");
  const [selected, setSelected] = useState<Event | null>(null);

  const q = useQuery({
    queryKey: ["webhook-events", provider],
    queryFn: async () => {
      let query = supabase
        .from("webhook_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (provider !== "all") query = query.eq("provider", provider);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Event[];
    },
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const urls = {
    mercadopago: `${origin}/api/public/webhooks/mercadopago`,
    pagseguro: `${origin}/api/public/webhooks/pagseguro`,
  };
  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("URL copiada"); };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <AdminPageHeader
          title="Webhooks"
          subtitle="Eventos recebidos dos provedores de pagamento com validação de assinatura"
        />
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ["webhook-events"] })}
          className="h-11 px-4 rounded-full bg-white border border-slate-200 text-sm inline-flex items-center gap-2 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(["mercadopago", "pagseguro"] as const).map((p) => (
          <div key={p} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">
              {p === "mercadopago" ? "Mercado Pago" : "PagSeguro"}
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1.5 truncate">
                {urls[p]}
              </code>
              <button onClick={() => copy(urls[p])} className="h-8 w-8 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-50">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {(["all", "mercadopago", "pagseguro"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setProvider(p)}
            className={`h-9 px-4 rounded-full text-sm border ${
              provider === p
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {p === "all" ? "Todos" : p === "mercadopago" ? "Mercado Pago" : "PagSeguro"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Data</th>
              <th className="text-left px-4 py-3">Provedor</th>
              <th className="text-left px-4 py-3">Evento</th>
              <th className="text-left px-4 py-3">ID Externo</th>
              <th className="text-left px-4 py-3">Assinatura</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {q.isLoading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Carregando...</td></tr>
            )}
            {!q.isLoading && (q.data?.length ?? 0) === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Nenhum evento recebido ainda.</td></tr>
            )}
            {q.data?.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  {new Date(e.created_at).toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {e.provider === "mercadopago" ? "Mercado Pago" : "PagSeguro"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{e.event_type ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{e.external_id ?? "—"}</td>
                <td className="px-4 py-3">
                  {e.signature_valid ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> Válida
                    </span>
                  ) : e.status === "no_secret_configured" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                      <AlertCircle className="h-4 w-4" /> Sem secret
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-rose-700">
                      <XCircle className="h-4 w-4" /> Inválida
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  HTTP {e.http_status ?? "—"} · {e.status}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setSelected(e)} className="text-xs text-emerald-700 hover:underline">
                    Ver payload
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">Detalhes do Evento</div>
                <div className="text-xs text-slate-500">{selected.provider} · {new Date(selected.created_at).toLocaleString("pt-BR")}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Payload</div>
                <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto">
{JSON.stringify(selected.payload, null, 2)}
                </pre>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Headers</div>
                <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto">
{JSON.stringify(selected.headers, null, 2)}
                </pre>
              </div>
              {selected.error && (
                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-3">
                  {selected.error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}