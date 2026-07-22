import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { useMemo, useState } from "react";
import { Users, Briefcase, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

type Row = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  is_professional: boolean | null;
  created_at: string;
};

function UsersPage() {
  const [tab, setTab] = useState<"clients" | "professionals">("clients");
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () =>
      (
        await supabase
          .from("profiles")
          .select("id,full_name,email,phone,city,is_professional,created_at")
          .order("created_at", { ascending: false })
          .limit(500)
      ).data ?? [],
  });

  const all = (q.data ?? []) as Row[];
  const clients = useMemo(() => all.filter((u) => !u.is_professional), [all]);
  const professionals = useMemo(() => all.filter((u) => u.is_professional), [all]);
  const source = tab === "clients" ? clients : professionals;
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return source;
    return source.filter((u) =>
      [u.full_name, u.email, u.phone, u.city].some((v) => v?.toLowerCase().includes(s)),
    );
  }, [source, search]);

  return (
    <div className="p-8 space-y-4">
      <AdminPageHeader title="Usuários" subtitle="Clientes e profissionais cadastrados na plataforma" />

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full bg-white border border-slate-200 p-1">
          <TabButton active={tab === "clients"} onClick={() => setTab("clients")} icon={Users} label="Clientes" count={clients.length} />
          <TabButton active={tab === "professionals"} onClick={() => setTab("professionals")} icon={Briefcase} label="Profissionais" count={professionals.length} />
        </div>
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email, telefone ou cidade..."
            className="w-full h-10 pl-9 pr-3 rounded-full border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr><th className="text-left p-3">Nome</th><th className="text-left p-3">Email</th><th className="text-left p-3">Telefone</th><th className="text-left p-3">Cidade</th><th className="text-left p-3">Cadastro</th></tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{u.full_name ?? "—"}</td>
                <td className="p-3 text-slate-600">{u.email ?? "—"}</td>
                <td className="p-3 text-slate-600">{u.phone ?? "—"}</td>
                <td className="p-3 text-slate-600">{u.city ?? "—"}</td>
                <td className="p-3 text-slate-500 text-xs">{new Date(u.created_at).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {q.isLoading && <div className="p-6 text-center text-slate-500">Carregando…</div>}
        {!q.isLoading && rows.length === 0 && (
          <div className="p-6 text-center text-slate-500">
            Nenhum {tab === "clients" ? "cliente" : "profissional"} encontrado.
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active, onClick, icon: Icon, label, count,
}: { active: boolean; onClick: () => void; icon: typeof Users; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 h-9 px-4 rounded-full text-sm font-medium transition ${
        active ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}>
        {count}
      </span>
    </button>
  );
}