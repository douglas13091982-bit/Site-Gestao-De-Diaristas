import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { Bell, Send, Users, Briefcase, UserCheck, CheckSquare, Square, Loader2 } from "lucide-react";
import { sendPushToUsers } from "@/lib/push.functions";

type Audience = "all" | "professionals" | "clients" | "select";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  head: () => ({ meta: [{ title: "Notificações Push — Admin Gersepa" }] }),
  component: AdminNotifications,
});

function AdminNotifications() {
  const qc = useQueryClient();
  const [audience, setAudience] = useState<Audience>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const users = useQuery({
    queryKey: ["admin-notif-users"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, email, is_professional").order("full_name")).data ?? [],
  });
  const recent = useQuery({
    queryKey: ["admin-notif-recent"],
    queryFn: async () => (await supabase.from("notifications").select("id, user_id, title, body, created_at, is_read").order("created_at", { ascending: false }).limit(30)).data ?? [],
  });

  const targets = useMemo(() => {
    const all = users.data ?? [];
    if (audience === "professionals") return all.filter((u) => u.is_professional);
    if (audience === "clients") return all.filter((u) => !u.is_professional);
    if (audience === "select") return all.filter((u) => selected.has(u.id));
    return all;
  }, [users.data, audience, selected]);

  const filtered = useMemo(() => {
    const all = users.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((u) => (u.full_name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q));
  }, [users.data, search]);

  const send = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Título obrigatório");
      if (!body.trim()) throw new Error("Mensagem obrigatória");
      if (targets.length === 0) throw new Error("Nenhum destinatário selecionado");
      const trimmedImage = imageUrl.trim();
      const trimmedLink = link.trim();
      const rows = targets.map((u) => ({
        user_id: u.id,
        title: title.trim(),
        body: body.trim(),
        link: trimmedLink || null,
        image_url: trimmedImage || null,
        is_read: false,
      }));
      const { error } = await supabase.from("notifications").insert(rows);
      if (error) throw error;
      // Dispara push (FCM) para quem tem token registrado
      let pushSent = 0;
      try {
        const userIds = targets.map((u) => u.id);
        const res = await sendPushToUsers({
          data: {
            userIds,
            title: title.trim(),
            body: body.trim(),
            link: trimmedLink || "/notificacoes",
            ...(trimmedImage ? { imageUrl: trimmedImage } : {}),
          },
        });
        pushSent = res?.sent ?? 0;
      } catch (err) {
        console.warn("[push] falha no envio FCM", err);
      }
      return { total: rows.length, pushSent };
    },
    onSuccess: ({ total, pushSent }) => {
      toast.success(
        `Notificação enviada para ${total} usuário(s)` +
          (pushSent ? ` — ${pushSent} push entregues` : ""),
      );
      setTitle(""); setBody(""); setLink(""); setImageUrl(""); setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-notif-recent"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleUser = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const AudBtn = ({ id, label, count, Icon }: { id: Audience; label: string; count: number; Icon: typeof Users }) => (
    <button
      type="button"
      onClick={() => setAudience(id)}
      className={`px-4 py-2 rounded-md text-sm font-medium border flex items-center gap-2 ${
        audience === id ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-emerald-300"
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
      <span className={`text-xs px-1.5 py-0.5 rounded ${audience === id ? "bg-emerald-600" : "bg-slate-100"}`}>{count}</span>
    </button>
  );

  const totalPros = (users.data ?? []).filter((u) => u.is_professional).length;
  const totalClients = (users.data ?? []).filter((u) => !u.is_professional).length;
  const totalAll = users.data?.length ?? 0;

  return (
    <div className="p-8">
      <AdminPageHeader title="Notificações Push" subtitle="Envie notificações in-app para clientes e diaristas da plataforma" />

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Bell className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-slate-900">Nova Notificação</h3>
        </div>

        <label className="text-xs font-medium text-slate-700 mb-2 block">Destinatários</label>
        <div className="flex flex-wrap gap-2 mb-5">
          <AudBtn id="all" label="Todos" count={totalAll} Icon={Users} />
          <AudBtn id="professionals" label="Diaristas" count={totalPros} Icon={Briefcase} />
          <AudBtn id="clients" label="Clientes" count={totalClients} Icon={UserCheck} />
          <AudBtn id="select" label="Selecionar" count={selected.size} Icon={CheckSquare} />
        </div>

        {audience === "select" && (
          <div className="mb-5 border border-slate-200 rounded-lg">
            <div className="p-3 border-b border-slate-100 bg-slate-50">
              <Input placeholder="Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {filtered.map((u) => {
                const on = selected.has(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleUser(u.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-left"
                  >
                    {on ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-900 truncate">{u.full_name || u.email}</div>
                      <div className="text-xs text-slate-500 truncate">{u.email}</div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${u.is_professional ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                      {u.is_professional ? "Diarista" : "Cliente"}
                    </span>
                  </button>
                );
              })}
              {filtered.length === 0 && <div className="p-4 text-center text-sm text-slate-500">Nenhum usuário encontrado</div>}
            </div>
          </div>
        )}

        <label className="text-xs font-medium text-slate-700 mb-1 block">Título *</label>
        <Input placeholder="Ex: Nova promoção disponível" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mb-4" />

        <label className="text-xs font-medium text-slate-700 mb-1 block">Mensagem *</label>
        <textarea
          placeholder="Digite a mensagem da notificação..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={500}
          className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm resize-none mb-4"
        />

        <label className="text-xs font-medium text-slate-700 mb-1 block">Link (opcional)</label>
        <Input placeholder="Ex: /dashboard ou https://..." value={link} onChange={(e) => setLink(e.target.value)} className="mb-5" />

        <label className="text-xs font-medium text-slate-700 mb-1 block">Imagem (URL — opcional)</label>
        <Input
          placeholder="https://.../banner.jpg"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="mb-3"
        />
        {imageUrl.trim() && (
          <div className="mb-5">
            <div className="text-[11px] text-slate-500 mb-1">Prévia</div>
            <img
              src={imageUrl}
              alt="Prévia da notificação"
              className="max-h-40 rounded-lg border border-slate-200 object-cover"
              onError={(e) => ((e.currentTarget.style.display = "none"))}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Será enviada para <span className="font-semibold text-slate-900">{targets.length}</span> usuário(s)
          </div>
          <Button onClick={() => send.mutate()} disabled={send.isPending} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            {send.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Enviar Notificação
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">Últimas notificações enviadas</div>
          <div className="text-xs text-slate-500">{recent.data?.length ?? 0} registros</div>
        </div>
        <div className="divide-y divide-slate-100">
          {(recent.data ?? []).map((n) => {
            const u = users.data?.find((x) => x.id === n.user_id);
            return (
              <div key={n.id} className="p-4 flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.is_read ? "bg-slate-100 text-slate-400" : "bg-emerald-100 text-emerald-600"}`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900">{n.title}</div>
                  <div className="text-sm text-slate-600 truncate">{n.body}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Para: {u?.full_name || u?.email || "usuário"} · {new Date(n.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${n.is_read ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"}`}>
                  {n.is_read ? "Lida" : "Enviada"}
                </span>
              </div>
            );
          })}
          {(recent.data?.length ?? 0) === 0 && <div className="p-8 text-center text-sm text-slate-500">Nenhuma notificação enviada ainda.</div>}
        </div>
      </div>
    </div>
  );
}