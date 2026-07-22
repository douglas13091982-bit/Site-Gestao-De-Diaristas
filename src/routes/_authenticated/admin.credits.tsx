import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/credits")({
  head: () => ({ meta: [{ title: "Créditos — Admin Gersepa" }] }),
  component: AdminCredits,
});

function AdminCredits() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-credits"],
    queryFn: async () => {
      const { data: tx } = await supabase
        .from("credit_transactions")
        .select("id, professional_id, amount, type, status, description, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      const ids = Array.from(new Set((tx ?? []).map((t) => t.professional_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name, credits").in("id", ids)
        : { data: [] as any[] };
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (tx ?? []).map((t) => ({ ...t, profile: map.get(t.professional_id) }));
    },
  });

  return (
    <div className="p-8">
      <AdminPageHeader title="Créditos" subtitle="Extrato de créditos das diaristas" />
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Data</th>
              <th className="text-left px-4 py-3">Diarista</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Descrição</th>
              <th className="text-right px-4 py-3">Valor</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Carregando…</td></tr>}
            {!isLoading && data?.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Nenhuma transação</td></tr>}
            {data?.map((t: any) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-500">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                <td className="px-4 py-2">{t.profile?.full_name ?? "—"}</td>
                <td className="px-4 py-2 capitalize">{t.type}</td>
                <td className="px-4 py-2 text-slate-600 truncate max-w-xs">{t.description ?? "—"}</td>
                <td className={`px-4 py-2 text-right font-medium ${Number(t.amount) < 0 ? "text-red-600" : "text-emerald-600"}`}>{Number(t.amount).toFixed(2)}</td>
                <td className="px-4 py-2">{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}