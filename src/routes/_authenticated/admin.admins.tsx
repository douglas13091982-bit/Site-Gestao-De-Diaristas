import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { ShieldCheck, UserPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/admins")({
  component: AdminsPage,
});

type AdminRow = {
  user_id: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
};

function AdminsPage() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const q = useQuery({
    queryKey: ["admin-admins"],
    queryFn: async (): Promise<AdminRow[]> => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, created_at")
        .eq("role", "admin")
        .order("created_at", { ascending: false });
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      const map = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (roles ?? []).map((r) => {
        const p = map.get(r.user_id);
        return {
          user_id: r.user_id,
          created_at: r.created_at,
          full_name: p?.full_name ?? null,
          email: p?.email ?? null,
        };
      });
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const target = email.trim().toLowerCase();
      if (!target) throw new Error("Informe o email");
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name")
        .ilike("email", target)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!profile) throw new Error("Usuário não encontrado. Ele precisa ter conta primeiro.");
      if (name.trim() && !profile.full_name) {
        await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", profile.id);
      }
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: profile.id, role: "admin" });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      toast.success("Administrador adicionado");
      setEmail("");
      setName("");
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Administrador removido");
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = q.data ?? [];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <AdminPageHeader title="Administradores" subtitle="Gerenciar quem pode acessar este painel" />

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4 text-slate-700">
          <UserPlus className="h-5 w-5 text-emerald-600" />
          <h3 className="font-semibold">Adicionar Administrador</h3>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMut.mutate();
          }}
          className="grid grid-cols-1 md:grid-cols-[1fr_240px_auto] gap-3"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email do novo administrador"
            className="w-full h-11 px-4 rounded-full border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome (opcional)"
            className="w-full h-11 px-4 rounded-full border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={addMut.isPending}
            className="h-11 px-6 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            {addMut.isPending ? "Adicionando..." : "Adicionar"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
          {rows.length} administrador{rows.length === 1 ? "" : "es"}
        </div>
        <ul className="divide-y divide-slate-100">
          {q.isLoading && <li className="p-6 text-center text-slate-500">Carregando...</li>}
          {!q.isLoading && rows.length === 0 && (
            <li className="p-6 text-center text-slate-500">Nenhum admin cadastrado.</li>
          )}
          {rows.map((a) => (
            <li key={a.user_id} className="px-5 py-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 truncate">
                  {a.full_name ?? "Sem nome"}
                </div>
                <div className="text-xs text-slate-500 truncate">{a.email ?? "—"}</div>
              </div>
              <div className="text-xs text-slate-400 whitespace-nowrap">
                Desde {new Date(a.created_at).toLocaleDateString("pt-BR")}
              </div>
              <button
                onClick={() => {
                  if (confirm(`Remover ${a.full_name ?? a.email} como admin?`)) {
                    delMut.mutate(a.user_id);
                  }
                }}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                title="Remover admin"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}