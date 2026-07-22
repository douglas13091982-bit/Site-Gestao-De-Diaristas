import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { Star, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/professionals")({
  component: ProsPage,
});

function ProsPage() {
  const q = useQuery({
    queryKey: ["admin-pros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,email,city,rating,total_reviews,is_verified,credits_balance")
        .eq("is_professional", true)
        .order("rating", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div className="p-8">
      <AdminPageHeader title="Profissionais" subtitle="Diaristas cadastradas na plataforma" />
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr><th className="text-left p-3">Nome</th><th className="text-left p-3">Cidade</th><th className="text-left p-3">Nota</th><th className="text-left p-3">Créditos</th><th className="text-left p-3">Status</th></tr>
          </thead>
          <tbody>
            {(q.data ?? []).map(p => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{p.full_name ?? "—"}<div className="text-xs text-slate-500">{p.email}</div></td>
                <td className="p-3 text-slate-600">{p.city ?? "—"}</td>
                <td className="p-3"><span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{Number(p.rating ?? 0).toFixed(1)} <span className="text-xs text-slate-500">({p.total_reviews ?? 0})</span></span></td>
                <td className="p-3 text-slate-700">{p.credits_balance ?? 0}</td>
                <td className="p-3">{p.is_verified ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><ShieldCheck className="h-3 w-3" />Verificada</span> : <span className="text-xs text-slate-500">Pendente</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {q.data?.length === 0 && <div className="p-6 text-center text-slate-500">Nenhuma profissional.</div>}
      </div>
    </div>
  );
}