import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { Star, Search, Eye, Ban, Trash2, Pencil, CheckCircle2, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCommissionPct, computePayout } from "@/hooks/use-commission";

export const Route = createFileRoute("/_authenticated/admin/professionals")({
  component: ProsPage,
});

type Pro = {
  id: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
  phone: string | null;
  pix_key: string | null;
  rating: number;
  total_reviews: number;
  total_bookings: number;
  // credits removed
  is_verified: boolean;
  is_available: boolean;
};

function whatsappUrl(phone: string | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  const number = /^(\d{10}|\d{11})$/.test(digits) ? "55" + digits : digits;
  return /^55\d{10,11}$/.test(number) ? "https://wa.me/" + number : null;
}

function ProsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const pct = useCommissionPct();
  type WhatsStatus = "active" | "inactive" | "unchecked";
  const [statuses, setStatuses] = useState<Record<string, WhatsStatus>>({});
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    try { setStatuses(JSON.parse(localStorage.getItem("gersepa-admin-whatsapp-status-v1") || "{}")); } catch {}
  }, []);
  const statusKey = (p: Pro) => p.id + ":" + (p.phone ?? "");
  const setStatus = (p: Pro, status: WhatsStatus) => {
    const next = { ...statuses, [statusKey(p)]: status };
    setStatuses(next);
    try { localStorage.setItem("gersepa-admin-whatsapp-status-v1", JSON.stringify(next)); }
    catch { toast.error("Não foi possível salvar a marcação neste navegador"); }
  };
  const toggleSelection = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const list = useQuery({
    queryKey: ["admin-pros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,email,city,phone,pix_key,rating,total_reviews,total_bookings,is_verified,is_available")
        .eq("is_professional", true)
        .order("rating", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Pro[];
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return list.data ?? [];
    return (list.data ?? []).filter(p =>
      (p.full_name ?? "").toLowerCase().includes(term) ||
      (p.city ?? "").toLowerCase().includes(term)
    );
  }, [list.data, q]);

  const rpc = supabase.rpc.bind(supabase) as unknown as (name: string, args?: Record<string, unknown>) => Promise<{data: unknown; error: {message: string} | null}>;
  const config = useQuery({queryKey: ["whatsapp-company"], queryFn: async () => {
    const r = await rpc("whatsapp_manual_config"); if (r.error) throw new Error(r.error.message); return r.data as string | null;
  }});
  const verified = useQuery({queryKey: ["whatsapp-confirmed", (list.data ?? []).map(p => [p.id,p.phone])], enabled: !!list.data, queryFn: async () => {
    const entries = await Promise.all((list.data ?? []).map(async p => {
      const r = await rpc("whatsapp_manual_status", {p_id:p.id}); if (r.error) throw new Error(r.error.message); return [p.id,r.data === true] as const;
    })); return Object.fromEntries(entries);
  }});
  const configure = async () => {
    const phone = window.prompt("WhatsApp da empresa (DDD + número)", config.data ?? "");
    if (phone === null) return;
    const r = await rpc("whatsapp_manual_config", {p_phone:phone});
    if (r.error) return toast.error(r.error.message);
    await config.refetch(); toast.success("WhatsApp configurado");
  };
  const confirmWhatsapp = async (p: Pro) => {
    const sender = window.prompt("Informe o número REMETENTE que aparece na mensagem recebida (não copie o número do cadastro).");
    if (!sender) return;
    const code = window.prompt("Código de seis dígitos recebido pelo WhatsApp");
    if (!code || !/^\d{6}$/.test(code.trim())) return toast.error("Informe seis dígitos");
    const r = await rpc("whatsapp_manual_confirm", {p_id:p.id,p_sender:sender,p_code:code.trim()});
    if (r.error) return toast.error(r.error.message);
    await verified.refetch(); toast.success("WhatsApp confirmado");
  };
  const balances = useQuery({
    queryKey: ["admin-pros-balances", pct],
    queryFn: async () => {
      const [bk, wd] = await Promise.all([
        supabase
          .from("bookings")
          .select("professional_id,total_price,status,payment_status")
          .eq("status", "completed")
          .eq("payment_status", "paid"),
        supabase
          .from("withdrawal_requests")
          .select("professional_id,amount,status"),
      ]);
      if (bk.error) throw bk.error;
      if (wd.error) throw wd.error;
      const map = new Map<string, number>();
      for (const r of bk.data ?? []) {
        if (!r.professional_id) continue;
        map.set(r.professional_id, (map.get(r.professional_id) ?? 0) + computePayout(r.total_price, pct));
      }
      for (const w of wd.data ?? []) {
        if (!w.professional_id) continue;
        if (w.status === "paid" || w.status === "pending" || w.status === "approved") {
          map.set(w.professional_id, (map.get(w.professional_id) ?? 0) - Number(w.amount));
        }
      }
      return map;
    },
  });

  const balanceOf = (id: string) => Math.max(0, balances.data?.get(id) ?? 0);

  const toggleVerified = useMutation({
    mutationFn: async (p: Pro) => {
      const { error } = await supabase.from("profiles").update({ is_verified: !p.is_verified }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["admin-pros"] }); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const toggleAvailable = useMutation({
    mutationFn: async (p: Pro) => {
      const { error } = await supabase.from("profiles").update({ is_available: !p.is_available }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Disponibilidade alterada"); qc.invalidateQueries({ queryKey: ["admin-pros"] }); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const del = useMutation({
    mutationFn: async (p: Pro) => {
      const { error } = await supabase.from("profiles").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profissional removida"); qc.invalidateQueries({ queryKey: ["admin-pros"] }); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await supabase.from("profiles").delete().eq("is_professional", true).in("id", ids).select("id");
      if (error) throw error;
      return (data ?? []).map(p => p.id);
    },
    onSuccess: (ids, requested) => {
      setSelected(prev => prev.filter(id => !ids.includes(id)));
      qc.invalidateQueries({ queryKey: ["admin-pros"] });
      qc.invalidateQueries({ queryKey: ["admin-pros-balances"] });
      if (ids.length === requested.length) toast.success(`${ids.length} profissionais removidas`);
      else toast.error(`${ids.length} de ${requested.length} removidas. Verifique as permissões ou vínculos restantes.`);
    },
    onError: (e: Error) => toast.error(e.message ?? "Erro ao excluir"),
  });

  const editPix = async (p: Pro) => {
    const v = window.prompt("Nova chave PIX", p.pix_key ?? "");
    if (v === null) return;
    const { error } = await supabase.from("profiles").update({ pix_key: v }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("PIX atualizado");
    qc.invalidateQueries({ queryKey: ["admin-pros"] });
  };

  return (
    <div className="p-4 md:p-8">
      <AdminPageHeader title="Profissionais" subtitle="Gerenciar profissionais cadastrados" />

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 flex flex-wrap items-center gap-3">
        <span className="text-sm">WhatsApp da empresa: {config.isError ? "Erro ao consultar" : config.data ?? "Não configurado"}</span>
        <button type="button" onClick={() => void configure()} className="rounded-md bg-emerald-600 px-3 py-2 text-xs text-white">Configurar WhatsApp</button>
        <button type="button" onClick={() => void verified.refetch()} className="rounded-md border px-3 py-2 text-xs">Atualizar verificações</button>
      </div>
      <div className="mb-4 relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou cidade..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-600">{selected.length} selecionadas</span>
        <button type="button" disabled={bulkDelete.isPending} onClick={() => setSelected(filtered.filter(p => statuses[statusKey(p)] === "inactive").map(p => p.id))} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">Selecionar inativas visíveis</button>
        <button type="button" disabled={!selected.length || bulkDelete.isPending} onClick={() => setSelected([])} className="rounded-md border border-slate-200 px-3 py-2 text-xs disabled:opacity-50">Limpar seleção</button>
        <button type="button" disabled={!selected.length || bulkDelete.isPending} onClick={() => { if (confirm(`Excluir definitivamente ${selected.length} profissionais selecionadas (inclusive fora do filtro)? Esta ação não pode ser desfeita.`)) bulkDelete.mutate([...selected]); }} className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Trash2 className="h-4 w-4" />{bulkDelete.isPending ? "Excluindo..." : "Excluir selecionadas"}</button>
        <span className="text-xs text-slate-500">Status WhatsApp manual, salvo neste navegador.</span>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-xs min-w-[1250px]">
            <colgroup>
              {["4%","15%","14%","12%","8%","5%","5%","12%","8%","6%","11%"].map((width, i) => <col key={i} style={{ width }} />)}
            </colgroup>
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="p-2"><input type="checkbox" aria-label="Selecionar todas as profissionais visíveis" disabled={bulkDelete.isPending || !filtered.length} checked={filtered.length > 0 && filtered.every(p => selected.includes(p.id))} onChange={e => setSelected(prev => e.target.checked ? Array.from(new Set([...prev, ...filtered.map(p => p.id)])) : prev.filter(id => !filtered.some(p => p.id === id)))} className="h-4 w-4 accent-emerald-600" /></th>
                <th className="text-left p-2 font-medium">Profissional</th>
                <th className="text-left p-2 font-medium">Telefone / WhatsApp</th>
                <th className="text-left p-2 font-medium">Status WhatsApp</th>
                <th className="text-left p-2 font-medium">Cidade</th>
                <th className="text-left p-2 font-medium">Aval.</th>
                <th className="text-left p-2 font-medium">Limp.</th>
                <th className="text-left p-2 font-medium">Chave PIX</th>
                <th className="text-left p-2 font-medium">Saldo</th>
                <th className="text-left p-2 font-medium">Verif.</th>
                <th className="text-left p-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.isLoading && (
                <tr><td colSpan={11} className="p-6 text-center text-slate-500">Carregando...</td></tr>
              )}
              {!list.isLoading && filtered.map(p => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="p-2">
                    <input type="checkbox" checked={selected.includes(p.id)} disabled={bulkDelete.isPending} onChange={() => toggleSelection(p.id)} aria-label={`Selecionar ${p.full_name ?? "profissional"}`} className="h-4 w-4 accent-emerald-600" />
                  </td>
                  <td className="p-2 font-medium text-slate-900">
                    <div className="truncate" title={p.full_name ?? ""}>{p.full_name ?? "—"}</div>
                    {verified.data?.[p.id] ? <span className="text-xs text-emerald-700">✓ WhatsApp confirmado</span> : <button type="button" onClick={() => void confirmWhatsapp(p)} className="mt-1 text-xs text-emerald-700 underline">Confirmar código</button>}
                  </td>
                  <td className="p-2 text-slate-600">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <span>{p.phone ?? "—"}</span>
                      {whatsappUrl(p.phone) && (
                        <a href={whatsappUrl(p.phone)!} target="_blank" rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center justify-center rounded-md bg-green-600 p-1.5 text-white hover:bg-green-700 focus-visible:ring-2 focus-visible:ring-green-500"
                          title="Conversar no WhatsApp" aria-label={`Conversar com ${p.full_name ?? "profissional"} no WhatsApp`}>
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                            <path d="M12 2a10 10 0 0 0-8.65 15.02L2 22l5.1-1.33A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.13l-.36-.21-2.65.69.7-2.57-.23-.37A8 8 0 1 1 12 20Zm4.4-5.96c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.64-1.2-1.43-1.34-1.67-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.47-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.39 1.37.5.57.18 1.1.16 1.51.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="p-2">
                    <select value={statuses[statusKey(p)] ?? "unchecked"} onChange={e => setStatus(p, e.target.value as WhatsStatus)} aria-label={`Status WhatsApp de ${p.full_name ?? "profissional"}`} className={`w-full rounded-md border border-slate-200 px-1 py-1.5 text-xs font-medium ${statuses[statusKey(p)] === "active" ? "bg-emerald-50 text-emerald-700" : statuses[statusKey(p)] === "inactive" ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-600"}`}>
                      <option value="unchecked">Não verificada</option>
                      <option value="active">Ativa</option>
                      <option value="inactive">Inativa</option>
                    </select>
                  </td>
                  <td className="p-2 text-slate-600 truncate">{p.city ?? "—"}</td>
                  <td className="p-2">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-medium">{Number(p.rating ?? 0).toFixed(1)}</span>
                    </span>
                  </td>
                  <td className="p-2 text-slate-700">{p.total_bookings ?? 0}</td>
                  <td className="p-2">
                    <button onClick={() => editPix(p)} className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-600 w-full">
                      <span className="truncate">{p.pix_key ?? "—"}</span>
                      <Pencil className="h-3 w-3 shrink-0" />
                    </button>
                  </td>
                  <td className="p-2">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <Wallet className="h-3.5 w-3.5" />
                      {balances.isLoading ? "…" : `R$ ${balanceOf(p.id).toFixed(2)}`}
                    </span>
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => toggleVerified.mutate(p)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${p.is_verified ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                    >
                      {p.is_verified ? "Sim" : "Não"}
                    </button>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <a href={`/professionals/${p.id}`} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Ver perfil">
                        <Eye className="h-4 w-4" />
                      </a>
                      <button onClick={() => toggleAvailable.mutate(p)} className={`p-1.5 rounded hover:bg-slate-100 ${p.is_available ? "text-rose-500" : "text-emerald-500"}`} title={p.is_available ? "Desativar" : "Reativar"}>
                        {p.is_available ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => { if (confirm(`Remover ${p.full_name}? Esta ação não pode ser desfeita.`)) del.mutate(p); }}
                        className="p-1.5 rounded hover:bg-rose-50 text-rose-500"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.isLoading && filtered.length === 0 && (
          <div className="p-6 text-center text-slate-500">Nenhuma profissional encontrada.</div>
        )}
      </div>
    </div>
  );
}