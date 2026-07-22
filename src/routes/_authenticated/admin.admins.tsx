import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/admins")({
  component: AdminsPage,
});

function AdminsPage() {
  const q = useQuery({
    queryKey: ["admin-admins"],
    queryFn: async () => {
      const roles = await supabase.from("user_roles").select("user_id").eq("role","admin");
      const ids = (roles.data ?? []).map(r => r.user_id);
      if (!ids.length) return [];
      return (await supabase.from("profiles").select("id,full_name,email").in("id", ids)).data ?? [];
    },
  });
  return (
    <div className="p-8">
      <AdminPageHeader title="Admins" subtitle="Usuários com permissão de administração" />
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {(q.data ?? []).map(a => (
          <div key={a.id} className="p-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <div>
              <div className="font-semibold">{a.full_name ?? "—"}</div>
              <div className="text-xs text-slate-500">{a.email}</div>
            </div>
          </div>
        ))}
        {q.data?.length === 0 && <div className="p-6 text-center text-slate-500">Nenhum admin.</div>}
      </div>
    </div>
  );
}