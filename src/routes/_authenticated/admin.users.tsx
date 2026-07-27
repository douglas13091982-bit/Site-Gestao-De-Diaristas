import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { useEffect, useMemo, useState } from "react";
import { Users, Briefcase, Search, Pencil, Ban, Trash2, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

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
  is_available?: boolean | null;
  created_at: string;
};

function UsersPage() {
  const [tab, setTab] = useState<"clients" | "professionals">("clients");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () =>
      (
        await supabase
          .from("profiles")
          .select("id,full_name,email,phone,city,is_professional,is_available,created_at")
          .order("created_at", { ascending: false })
          .limit(500)
      ).data ?? [],
  });

  const blockedQ = useQuery({
    queryKey: ["blocked-emails"],
    queryFn: async () =>
      ((await supabase.from("blocked_emails").select("email")).data ?? []).map((r: any) => r.email as string),
  });
  const blockedSet = useMemo(() => new Set((blockedQ.data ?? []).map((e) => e.toLowerCase())), [blockedQ.data]);

  const isBlocked = (u: Row) =>
    (u.email && blockedSet.has(u.email.toLowerCase())) || (u.is_professional && u.is_available === false);

  const toggleBlock = useMutation({
    mutationFn: async (u: Row) => {
      const blocked = isBlocked(u);
      if (blocked) {
        if (u.email) await supabase.from("blocked_emails").delete().eq("email", u.email);
        if (u.is_professional) await supabase.from("profiles").update({ is_available: true }).eq("id", u.id);
      } else {
        if (u.email) {
          await supabase.from("blocked_emails").upsert({ email: u.email, reason: "Bloqueado pelo admin", blocked_by: "admin" }, { onConflict: "email" });
        }
        if (u.is_professional) await supabase.from("profiles").update({ is_available: false }).eq("id", u.id);
      }
    },
    onSuccess: (_d, u) => {
      toast.success(isBlocked(u) ? "Usuário desbloqueado" : "Usuário bloqueado");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["blocked-emails"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao alterar status"),
  });

  const del = useMutation({
    mutationFn: async (u: Row) => {
      const { error } = await supabase.from("profiles").delete().eq("id", u.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário excluído");
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir"),
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
    <div className="p-4 md:p-8 space-y-4">
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
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Usuário</th>
              <th className="text-left p-3">Telefone</th>
              <th className="text-left p-3">Tipo</th>
              <th className="text-left p-3">Cidade</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Cadastro</th>
              <th className="text-right p-3 pr-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const blocked = isBlocked(u);
              return (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3">
                    <div className="font-medium text-slate-900">{u.full_name ?? "—"}</div>
                    <div className="text-xs text-slate-500">{u.email ?? "—"}</div>
                  </td>
                  <td className="p-3 text-slate-600">{u.phone ?? "—"}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_professional ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                      {u.is_professional ? "Profissional" : "Cliente"}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">{u.city ?? "—"}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${blocked ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {blocked ? "Bloqueado" : "Ativo"}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500 text-xs">{new Date(u.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="p-3 pr-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setEditing(u)} title="Editar" className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => toggleBlock.mutate(u)} title={blocked ? "Desbloquear" : "Bloquear"} className={`p-1.5 rounded hover:bg-slate-100 ${blocked ? "text-emerald-600" : "text-slate-500"}`}>
                        {blocked ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                      </button>
                      <button onClick={() => setConfirmDelete(u)} title="Excluir" className="p-1.5 rounded hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {q.isLoading && <div className="p-6 text-center text-slate-500">Carregando…</div>}
        {!q.isLoading && rows.length === 0 && (
          <div className="p-6 text-center text-slate-500">
            Nenhum {tab === "clients" ? "cliente" : "profissional"} encontrado.
          </div>
        )}
      </div>

      {editing && <EditModal user={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin-users"] }); }} />}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Excluir usuário?</h3>
            <p className="text-sm text-slate-600 mt-2">Esta ação removerá <strong>{confirmDelete.full_name ?? confirmDelete.email}</strong> permanentemente do banco.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 rounded-md text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
              <button onClick={() => del.mutate(confirmDelete)} disabled={del.isPending} className="px-3 py-1.5 rounded-md text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                {del.isPending ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditModal({ user, onClose, onSaved }: { user: Row; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    full_name: user.full_name ?? "",
    phone: user.phone ?? "",
    city: user.city ?? "",
  });
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Usuário atualizado"); onSaved(); },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-lg font-bold text-slate-900">Editar usuário</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Email"><input value={user.email ?? ""} disabled className="w-full h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-500" /></Field>
          <Field label="Nome"><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm" /></Field>
          <Field label="Telefone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm" /></Field>
          <Field label="Cidade"><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm" /></Field>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t bg-slate-50">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button onClick={() => save.mutate()} disabled={save.isPending} className="px-4 py-1.5 rounded-md text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
            {save.isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600 mb-1 block">{label}</span>
      {children}
    </label>
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