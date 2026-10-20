import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { Button } from "@/components/ui/button";
import { generateResetLinkForRequest, ignoreResetRequest } from "@/lib/account.functions";
import { MessageCircle, Copy, Trash2, RefreshCw } from "lucide-react";

type Req = {
  id: number;
  email: string;
  full_name: string | null;
  phone: string | null;
  is_professional: boolean;
  status: "pending" | "sent" | "ignored";
  handled_at: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/admin/password-resets")({
  head: () => ({ meta: [{ title: "Redefinições de senha — Admin Gersepa" }] }),
  component: PasswordResetsPage,
});

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function waLink(phone: string, message: string) {
  const digits = onlyDigits(phone);
  // adiciona 55 se BR sem DDI
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

function PasswordResetsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "sent" | "ignored">("pending");
  const genLink = useServerFn(generateResetLinkForRequest);
  const ignore = useServerFn(ignoreResetRequest);

  const q = useQuery({
    queryKey: ["password-reset-requests", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("password_reset_requests")
        .select("id,email,full_name,phone,is_professional,status,handled_at,created_at")
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Req[];
    },
  });

  async function handleSend(r: Req) {
    try {
      const res = await genLink({
        data: {
          requestId: r.id,
          redirectTo: `${window.location.origin}/reset-password`,
        },
      });
      const nome = res.fullName?.split(" ")[0] ?? "";
      const oi = nome ? `Olá, ${nome}! ` : "Olá! ";
      const msg =
        `${oi}Aqui é da Gersepa Solutions. Segue seu link para criar uma nova senha ` +
        `(válido por 1 hora): ${res.link}`;
      if (res.phone) {
        window.open(waLink(res.phone, msg), "_blank", "noopener,noreferrer");
        toast.success("Link gerado — WhatsApp aberto em nova aba.");
      } else {
        await navigator.clipboard.writeText(res.link).catch(() => {});
        toast.success("Link copiado (usuária sem telefone cadastrado).");
      }
      qc.invalidateQueries({ queryKey: ["password-reset-requests"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar link");
    }
  }

  async function handleCopyLink(r: Req) {
    try {
      const res = await genLink({
        data: {
          requestId: r.id,
          redirectTo: `${window.location.origin}/reset-password`,
        },
      });
      await navigator.clipboard.writeText(res.link);
      toast.success("Link copiado para a área de transferência.");
      qc.invalidateQueries({ queryKey: ["password-reset-requests"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar link");
    }
  }

  async function handleIgnore(r: Req) {
    if (!confirm("Ignorar este pedido? A pessoa precisará pedir de novo.")) return;
    try {
      await ignore({ data: { requestId: r.id } });
      toast.success("Pedido marcado como ignorado.");
      qc.invalidateQueries({ queryKey: ["password-reset-requests"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <AdminPageHeader
        title="Redefinições de senha"
        subtitle="Pedidos feitos pela tela de login. Envie o link por WhatsApp para a diarista / cliente."
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={async () => {
                const msg =
                  `Olá! Aqui é da Gersepa Solutions. 😊\n\n` +
                  `Para continuar recebendo agendamentos, crie sua nova senha:\n` +
                  `1. Acesse ${window.location.origin}/auth\n` +
                  `2. Digite seu e-mail\n` +
                  `3. Toque em "Criar / redefinir senha"\n\n` +
                  `Você vai receber um link no seu e-mail para criar a nova senha. ` +
                  `Se não encontrar, confira a caixa de spam.`;
                try {
                  await navigator.clipboard.writeText(msg);
                  toast.success("Mensagem copiada! Cole no grupo ou lista de transmissão do WhatsApp.");
                } catch {
                  toast.error("Não foi possível copiar a mensagem.");
                }
              }}
            >
              <MessageCircle className="h-4 w-4 mr-1" /> Copiar aviso para diaristas
            </Button>
            <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["password-reset-requests"] })}>
              <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
            </Button>
          </div>
        }
      />

      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
        {(["pending", "sent", "ignored"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md ${tab === t ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {t === "pending" ? "Pendentes" : t === "sent" ? "Enviados" : "Ignorados"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        {q.isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Carregando…</div>
        ) : !q.data || q.data.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">Sem pedidos {tab === "pending" ? "pendentes" : tab === "sent" ? "enviados" : "ignorados"}.</div>
        ) : (
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">Pessoa</th>
                <th className="text-left px-4 py-2">Contato</th>
                <th className="text-left px-4 py-2">Solicitado em</th>
                <th className="text-right px-4 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{r.full_name || "—"}</div>
                    <div className="text-xs text-slate-500">
                      {r.is_professional ? "Diarista" : "Cliente"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{r.email}</div>
                    <div className="text-xs text-slate-500">{r.phone || "Sem telefone"}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                    {r.handled_at && (
                      <div className="text-xs text-slate-400">
                        tratado {new Date(r.handled_at).toLocaleString("pt-BR")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2 flex-wrap">
                      {tab !== "sent" && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleSend(r)}
                          disabled={!r.phone}
                          title={r.phone ? "Gerar link e abrir WhatsApp" : "Sem telefone cadastrado"}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" /> Enviar WhatsApp
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleCopyLink(r)}>
                        <Copy className="h-4 w-4 mr-1" /> Copiar link
                      </Button>
                      {tab === "pending" && (
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleIgnore(r)}>
                          <Trash2 className="h-4 w-4 mr-1" /> Ignorar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-500">
        O link de recovery é válido por 1 hora e leva a pessoa direto para <code>/reset-password</code>.
        Cada clique em <b>Enviar WhatsApp</b> ou <b>Copiar link</b> gera um link novo e invalida o anterior.
      </p>
    </div>
  );
}