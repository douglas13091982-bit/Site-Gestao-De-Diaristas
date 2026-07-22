import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { useState, useMemo } from "react";
import { Search, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/emails")({
  head: () => ({ meta: [{ title: "Emails — Admin Gersepa" }] }),
  component: AdminEmails,
});

function AdminEmails() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "professional" | "client">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-emails"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, is_professional, created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const rows = useMemo(() => {
    const list = (data ?? []).filter((r: any) => {
      if (filter === "professional" && !r.is_professional) return false;
      if (filter === "client" && r.is_professional) return false;
      if (q && !`${r.email ?? ""} ${r.full_name ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    return list;
  }, [data, q, filter]);

  const copyAll = () => {
    const text = rows.map((r: any) => r.email).filter(Boolean).join(", ");
    navigator.clipboard.writeText(text);
    toast.success(`${rows.length} emails copiados`);
  };

  return (
    <div className="p-8">
      <AdminPageHeader
        title="Emails"
        subtitle="Lista de emails cadastrados na plataforma"
        actions={
          <button onClick={copyAll} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg">
            <Copy className="h-4 w-4" /> Copiar todos
          </button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por email ou nome..." className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="all">Todos</option>
          <option value="professional">Diaristas</option>
          <option value="client">Clientes</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Carregando…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Nenhum registro</td></tr>}
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{r.full_name ?? "—"}</td>
                <td className="px-4 py-2 font-medium">{r.email ?? "—"}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.is_professional ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {r.is_professional ? "Diarista" : "Cliente"}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-500">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 text-xs text-slate-500 border-t">{rows.length} registros</div>
      </div>
    </div>
  );
}