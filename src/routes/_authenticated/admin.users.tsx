import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const q = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await supabase.from("profiles").select("id,full_name,email,phone,city,created_at").order("created_at",{ascending:false}).limit(200)).data ?? [],
  });
  return (
    <div className="p-8">
      <AdminPageHeader title="Usuários" subtitle="Todos os usuários cadastrados" />
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr><th className="text-left p-3">Nome</th><th className="text-left p-3">Email</th><th className="text-left p-3">Telefone</th><th className="text-left p-3">Cidade</th><th className="text-left p-3">Cadastro</th></tr>
          </thead>
          <tbody>
            {(q.data ?? []).map(u => (
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
        {q.data?.length === 0 && <div className="p-6 text-center text-slate-500">Nenhum usuário.</div>}
      </div>
    </div>
  );
}