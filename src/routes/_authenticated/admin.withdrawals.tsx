import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader } from "./admin";
import { Wallet, CheckCircle2, XCircle, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/withdrawals")({
  head: () => ({ meta: [{ title: "Saques — Admin Gersepa" }] }),
  component: AdminWithdrawals,
});

type WR = {
  id: number;
  professional_id: string;
  amount: number;
  pix_key: string;
  pix_key_type: string | null;
  status: string;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
  professional?: { full_name: string | null; profile_photo: string | null; email: string | null } | null;
};

function AdminWithdrawals() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("pending");

  const q = useQuery({
    queryKey: ["admin-withdrawals", filter],
    queryFn: async () => {
      let query = supabase
        .from("withdrawal_requests")
        .select("id,professional_id,amount,pix_key,pix_key_type,status,notes,admin_notes,created_at,processed_at, professional:profiles!withdrawal_requests_professional_id_fkey(full_name,profile_photo,email)")
        .order("created_at", { ascending: false });
      if (filter !== "all") query = query.eq("status", filter);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as WR[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin-withdrawals-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, (payload) => {
        qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
        if (payload.eventType === "INSERT") {
          const row = payload.new as { amount: number };
          toast.success(`Nova solicitação de saque: R$ ${Number(row.amount).toFixed(2)}`, { duration: 6000 });
          try { new Audio("/sounds/notify.mp3").play().catch(() => {}); } catch {}
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const update = useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: number; status: string; admin_notes?: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({ status, admin_notes: admin_notes ?? null, processed_at: new Date().toISOString(), processed_by: userRes.user?.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação atualizada.");
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = q.data ?? [];
  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <AdminPageHeader
        title="Solicitações de saque"
        subtitle="Aprove e marque como pago os pedidos das diaristas. Atualizações chegam em tempo real."
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { k: "pending", label: `Pendentes${pendingCount ? ` (${pendingCount})` : ""}` },
          { k: "approved", label: "Aprovados" },
          { k: "paid", label: "Pagos" },
          { k: "rejected", label: "Recusados" },
          { k: "all", label: "Todos" },
        ].map((t) => (
          <button key={t.k} onClick={() => setFilter(t.k)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${filter === t.k ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-700 border-slate-200"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center text-slate-500">
          <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Nenhuma solicitação neste filtro.
        </div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => <WRItem key={r.id} r={r} onUpdate={(status, admin_notes) => update.mutate({ id: r.id, status, admin_notes })} pending={update.isPending} />)}
        </ul>
      )}
    </div>
  );
}

function WRItem({ r, onUpdate, pending }: { r: WR; onUpdate: (status: string, admin_notes?: string) => void; pending: boolean }) {
  const [note, setNote] = useState("");
  const cls = {
    pending: "border-amber-300 bg-amber-50",
    approved: "border-sky-300 bg-sky-50",
    paid: "border-emerald-300 bg-emerald-50",
    rejected: "border-rose-300 bg-rose-50",
  }[r.status] ?? "border-slate-200 bg-white";

  return (
    <li className={`rounded-xl border p-4 ${cls}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {r.professional?.profile_photo ? (
            <img src={r.professional.profile_photo} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-slate-200" />
          )}
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 truncate">{r.professional?.full_name ?? "Diarista"}</div>
            <div className="text-xs text-muted-foreground truncate">{r.professional?.email}</div>
            <div className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold text-emerald-700">R$ {Number(r.amount).toFixed(2)}</div>
          <div className="text-[11px] uppercase font-bold text-slate-600">{r.status}</div>
        </div>
      </div>

      <div className="mt-3 text-xs grid gap-1 sm:grid-cols-2">
        <div><span className="text-slate-500">Chave PIX ({r.pix_key_type || "chave"}):</span> <span className="font-mono">{r.pix_key}</span></div>
        {r.notes && <div><span className="text-slate-500">Obs. da diarista:</span> {r.notes}</div>}
        {r.admin_notes && <div className="sm:col-span-2"><span className="text-slate-500">Obs. admin:</span> {r.admin_notes}</div>}
      </div>

      {r.status === "pending" && (
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (opcional)" className="flex-1 rounded-lg border px-3 py-2 text-sm" />
          <button disabled={pending} onClick={() => onUpdate("approved", note)} className="inline-flex items-center justify-center gap-1 rounded-lg bg-sky-600 text-white text-sm font-semibold px-3 py-2 hover:bg-sky-700 disabled:opacity-50">
            <CheckCircle2 className="h-4 w-4" /> Aprovar
          </button>
          <button disabled={pending} onClick={() => onUpdate("paid", note || "Pago via PIX")} className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 text-white text-sm font-semibold px-3 py-2 hover:bg-emerald-700 disabled:opacity-50">
            <Send className="h-4 w-4" /> Marcar pago
          </button>
          <button disabled={pending} onClick={() => onUpdate("rejected", note)} className="inline-flex items-center justify-center gap-1 rounded-lg bg-rose-600 text-white text-sm font-semibold px-3 py-2 hover:bg-rose-700 disabled:opacity-50">
            <XCircle className="h-4 w-4" /> Recusar
          </button>
        </div>
      )}
      {r.status === "approved" && (
        <div className="mt-3 flex gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Comprovante / observação" className="flex-1 rounded-lg border px-3 py-2 text-sm" />
          <button disabled={pending} onClick={() => onUpdate("paid", note || "Pago via PIX")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white text-sm font-semibold px-3 py-2 hover:bg-emerald-700 disabled:opacity-50">
            <Send className="h-4 w-4" /> Marcar como pago
          </button>
        </div>
      )}
    </li>
  );
}