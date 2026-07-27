import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/blocked")({
  head: () => ({ meta: [{ title: "Emails Bloqueados — Admin Gersepa" }] }),
  component: AdminBlocked,
});

function AdminBlocked() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-blocked-emails"],
    queryFn: async () => {
      const { data } = await supabase.from("blocked_emails").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!email.trim()) throw new Error("Informe um email");
      const { error } = await supabase.from("blocked_emails").insert({ email: email.trim().toLowerCase(), reason: reason.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Email bloqueado"); setEmail(""); setReason(""); qc.invalidateQueries({ queryKey: ["admin-blocked-emails"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("blocked_emails").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Email desbloqueado"); qc.invalidateQueries({ queryKey: ["admin-blocked-emails"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-8">
      <AdminPageHeader title="Emails Bloqueados" subtitle="Impedir cadastro de emails específicos na plataforma" />

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-3">
          <input type="email" placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
          <input type="text" placeholder="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
          <button onClick={() => add.mutate()} disabled={add.isPending} className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
            <Plus className="h-4 w-4" /> Bloquear
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Motivo</th>
              <th className="text-left px-4 py-3">Bloqueado em</th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Carregando…</td></tr>}
            {!isLoading && data?.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Nenhum email bloqueado</td></tr>}
            {data?.map((b: any) => (
              <tr key={b.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{b.email}</td>
                <td className="px-4 py-2 text-slate-600">{b.reason ?? "—"}</td>
                <td className="px-4 py-2 text-slate-500">{new Date(b.created_at).toLocaleString("pt-BR")}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => confirm("Desbloquear este email?") && remove.mutate(b.id)} className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50 inline-flex items-center gap-1">
                    <Trash2 className="h-3.5 w-3.5" /> Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}