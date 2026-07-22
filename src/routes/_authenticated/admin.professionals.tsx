import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { Star, Search, Eye, Ban, Trash2, Pencil, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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

function ProsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

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

  const editPix = async (p: Pro) => {
    const v = window.prompt("Nova chave PIX", p.pix_key ?? "");
    if (v === null) return;
    const { error } = await supabase.from("profiles").update({ pix_key: v }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("PIX atualizado");
    qc.invalidateQueries({ queryKey: ["admin-pros"] });
  };

  return (
    <div className="p-8">
      <AdminPageHeader title="Profissionais" subtitle="Gerenciar profissionais cadastrados" />

      <div className="mb-4 relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou cidade..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div>
          <table className="w-full table-fixed text-xs">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[7%]" />
              <col className="w-[11%]" />
              <col className="w-[16%]" />
              <col className="w-[9%]" />
              <col className="w-[23%]" />
            </colgroup>
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left p-2 font-medium">Profissional</th>
                <th className="text-left p-2 font-medium">Cidade</th>
                <th className="text-left p-2 font-medium">Aval.</th>
                <th className="text-left p-2 font-medium">Limp.</th>
                <th className="text-left p-2 font-medium">Telefone</th>
                <th className="text-left p-2 font-medium">Chave PIX</th>
                <th className="text-left p-2 font-medium">Verif.</th>
                <th className="text-left p-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.isLoading && (
                <tr><td colSpan={8} className="p-6 text-center text-slate-500">Carregando...</td></tr>
              )}
              {!list.isLoading && filtered.map(p => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="p-2 font-medium text-slate-900 truncate">{p.full_name ?? "—"}</td>
                  <td className="p-2 text-slate-600 truncate">{p.city ?? "—"}</td>
                  <td className="p-2">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-medium">{Number(p.rating ?? 0).toFixed(1)}</span>
                    </span>
                  </td>
                  <td className="p-2 text-slate-700">{p.total_bookings ?? 0}</td>
                  <td className="p-2 text-slate-600 truncate">{p.phone ?? "—"}</td>
                  <td className="p-2">
                    <button onClick={() => editPix(p)} className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-600 w-full">
                      <span className="truncate">{p.pix_key ?? "—"}</span>
                      <Pencil className="h-3 w-3 shrink-0" />
                    </button>
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