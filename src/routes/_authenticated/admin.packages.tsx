import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/packages")({
  head: () => ({ meta: [{ title: "Pacotes — Admin Gersepa" }] }),
  component: AdminPackages,
});

function AdminPackages() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-packages"],
    queryFn: async () => {
      const { data } = await supabase.from("pricing_packages").select("*").order("display_order");
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async (row: any) => {
      const { id, ...rest } = row;
      const { error } = await supabase.from("pricing_packages").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pacote atualizado"); qc.invalidateQueries({ queryKey: ["admin-packages"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("pricing_packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pacote removido"); qc.invalidateQueries({ queryKey: ["admin-packages"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pricing_packages").insert({
        duration_hours: 4, price: 150, is_enabled: true, display_order: (data?.length ?? 0) + 1, start_time: "08:00",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pacote criado"); qc.invalidateQueries({ queryKey: ["admin-packages"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-8">
      <AdminPageHeader
        title="Pacotes de Preço"
        subtitle="Gerenciar pacotes de duração e preços dos serviços"
        actions={
          <button onClick={() => create.mutate()} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg">
            <Plus className="h-4 w-4" /> Novo Pacote
          </button>
        }
      />
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Duração</th>
              <th className="text-left px-4 py-3">Preço</th>
              <th className="text-left px-4 py-3">Ativo</th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Carregando…</td></tr>}
            {!isLoading && data?.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Nenhum pacote</td></tr>}
            {data?.map((p: any) => <PackageRow key={p.id} pkg={p} onSave={(row) => update.mutate(row)} onDelete={() => remove.mutate(p.id)} />)}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function PackageRow({ pkg, onSave, onDelete }: { pkg: any; onSave: (row: any) => void; onDelete: () => void }) {
  const [row, setRow] = useState(pkg);
  const dirty = JSON.stringify(row) !== JSON.stringify(pkg);
  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <input type="number" step="0.5" value={row.duration_hours} onChange={(e) => setRow({ ...row, duration_hours: Number(e.target.value) })} className="w-20 border rounded px-2 py-1" />
          <span className="text-slate-500">{row.duration_hours === 1 ? "hora" : "horas"}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="text-slate-500">R$</span>
          <input type="number" step="0.01" value={row.price} onChange={(e) => setRow({ ...row, price: Number(e.target.value) })} className="w-28 border rounded px-2 py-1" />
        </div>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => { const next = { ...row, is_enabled: !row.is_enabled }; setRow(next); onSave(next); }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${row.is_enabled ? "bg-emerald-500" : "bg-slate-300"}`}
          aria-label="Alternar ativo"
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${row.is_enabled ? "translate-x-5" : "translate-x-1"}`} />
        </button>
      </td>
      <td className="px-4 py-2 text-right space-x-2">
        <button disabled={!dirty} onClick={() => onSave(row)} className="text-xs px-3 py-1 rounded bg-emerald-600 text-white disabled:opacity-40">Salvar</button>
        <button onClick={() => confirm("Excluir pacote?") && onDelete()} className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
      </td>
    </tr>
  );
}