import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { Bell, Send, Users, Briefcase, UserCheck, CheckSquare, Square, Loader2, Upload, X, Zap } from "lucide-react";
import { listAdminPushRecipients, sendPushToUsers } from "@/lib/push.functions";
import { PushNotificationButton } from "@/components/PushNotificationButton";

type Audience = "all" | "professionals" | "clients" | "select";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  head: () => ({ meta: [{ title: "Notificações Push — Admin Gersepa" }] }),
  component: AdminNotifications,
});

function AdminNotifications() {
  const qc = useQueryClient();
  const [lastPush, setLastPush] = useState<{ sent: number; failed: number; unknown: number } | null>(null);
  const [audience, setAudience] = useState<Audience>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const users = useQuery({
    queryKey: ["admin-notif-users"],
    queryFn: () => listAdminPushRecipients(),
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

  const eligible = targets.filter((recipient) => recipient.devices > 0);
  const devices = eligible.reduce((total, recipient) => total + recipient.devices, 0);

  const send = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !body.trim()) throw new Error("Informe o título e a mensagem.");
      if (!eligible.length) throw new Error("Nenhum destinatário tem um dispositivo registrado.");
      const payload = {
        title: title.trim(),
        body: body.trim(),
        link: link.trim() || "/",
        ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
        systemNotification: true,
      };
      let sent = 0;
      let failed = 0;
      let unknown = 0;
      for (let start = 0; start < eligible.length; start += 100) {
        const batch = eligible.slice(start, start + 100);
        try {
          const result = await sendPushToUsers({ data: { ...payload, userIds: batch.map(({ id }) => id) } });
          if (result.error) throw new Error(result.error);
          sent += result.sent;
          failed += result.failed;
        } catch (error) {
          console.warn("[push] lote sem retorno confirmado", error);
          unknown += batch.length;
        }
      }
      return { sent, failed, unknown };
    },
    onSuccess: (result) => {
      setLastPush(result);
      if (!result.sent) toast.warning("Nenhum push aceito pelo Firebase. Veja o resultado abaixo.");
      else if (result.failed || result.unknown) toast.warning("Envio parcial. Veja o resultado abaixo.");
      else toast.success(`Firebase aceitou o push para ${result.sent} dispositivo(s).`);
      if (result.sent && !result.failed && !result.unknown) {
        setTitle(""); setBody(""); setLink(""); setImageUrl(""); setSelected(new Set());
      }
      void qc.invalidateQueries({ queryKey: ["admin-notif-users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const sendTestToMe = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Você precisa estar logado.");
      const result = await sendPushToUsers({ data: {
        userIds: [user.id],
        title: "Teste de notificação push",
        body: "Este aviso foi enviado pelo Super Admin.",
        link: "/",
        systemNotification: true,
      } });
      if (result.error) throw new Error("Não foi possível consultar os dispositivos registrados.");
      return result;
    },
    onSuccess: ({ sent, failed }) => {
      if (sent) toast.success(`Firebase aceitou o teste para ${sent} dispositivo(s). Confira a central de notificações do aparelho.`);
      else if (failed) toast.error("O Firebase rejeitou o teste neste dispositivo.");
      else toast.warning("Nenhum dispositivo registrado. Ative ou registre este dispositivo.");
    },
    onError: () => toast.error("O teste de push falhou. Confira a configuração do Firebase."),
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
    <div className="p-4 md:p-8">
      <AdminPageHeader title="Notificações Push" subtitle="Envie notificações do sistema para clientes e diaristas com dispositivos registrados" />

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">Receber notificações neste dispositivo</p>
          <p className="text-xs text-slate-500">Necessário para testar o envio de push para você.</p>
        </div>
        <PushNotificationButton />
      </div>

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
                      <div className="text-sm text-slate-900 truncate">{u.full_name || u.email || "Conta sem perfil"}</div>
                      <div className="text-xs text-slate-500 truncate">{u.email ? `${u.email} · ` : ""}{u.devices ? `${u.devices} dispositivo(s)` : "Sem push registrado"}</div>
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
          maxLength={300}
          className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm resize-none mb-4"
        />

        <label className="text-xs font-medium text-slate-700 mb-1 block">Link (opcional)</label>
        <Input placeholder="Ex: / ou https://..." maxLength={300} value={link} onChange={(e) => setLink(e.target.value)} className="mb-5" />

        <label className="text-xs font-medium text-slate-700 mb-1 block">Imagem (opcional)</label>
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <label
            className={`inline-flex items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-100 ${uploading ? "opacity-60 pointer-events-none" : ""}`}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Enviando..." : "Enviar JPG/PNG"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                  toast.error("Imagem muito grande (máx 5MB)");
                  return;
                }
                setUploading(true);
                try {
                  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
                  const path = `admin/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
                  const { error: upErr } = await supabase.storage
                    .from("notification-images")
                    .upload(path, file, { contentType: file.type, upsert: false });
                  if (upErr) throw upErr;
                  const { data: signed, error: signErr } = await supabase.storage
                    .from("notification-images")
                    .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 ano
                  if (signErr) throw signErr;
                  setImageUrl(signed.signedUrl);
                  toast.success("Imagem enviada");
                } catch (err) {
                  const msg = err instanceof Error ? err.message : "Falha no upload";
                  toast.error(msg);
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
          <Input
            placeholder="ou cole uma URL https://..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="flex-1"
          />
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" /> Remover
            </button>
          )}
        </div>
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            {users.isError ? "Não foi possível carregar a cobertura de push." : users.isLoading ? "Carregando destinatários…" : <><strong>{eligible.length} de {targets.length}</strong> conta(s) com push · <strong>{devices}</strong> dispositivo(s) registrado(s)</>}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => sendTestToMe.mutate()}
              disabled={sendTestToMe.isPending}
              variant="outline"
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              {sendTestToMe.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Enviar teste para mim
            </Button>
            <Button onClick={() => send.mutate()} disabled={send.isPending || uploading || !eligible.length} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              {send.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar push
            </Button>
          </div>
        </div>
      </div>

      {lastPush && (
        <div role="status" className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="font-semibold text-slate-900">Resultado da última tentativa</h3>
          <p className="mt-1 text-sm text-slate-600">
            {lastPush.sent} dispositivo(s) aceitos pelo Firebase · {lastPush.failed} falha(s) · {lastPush.unknown} conta(s) sem retorno confirmado
          </p>
        </div>
      )}
    </div>
  );
}
