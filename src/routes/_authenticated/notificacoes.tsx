import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { Bell, BellOff, CheckCheck, Trash2, ExternalLink, Stethoscope } from "lucide-react";
import { toast } from "sonner";

type Notif = {
  id: number;
  title: string;
  body: string | null;
  link: string | null;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/notificacoes")({
  head: () => ({
    meta: [
      { title: "Central de Notificações — Gersepa Solutions" },
      { name: "description", content: "Veja e gerencie suas notificações." },
    ],
  }),
  component: NotificationsCenter,
});

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function NotificationsCenter() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    enabled: !!user,
    queryKey: ["my-notifications", user?.id],
    queryFn: async (): Promise<Notif[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, link, image_url, is_read, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Notif[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["my-notifications", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  const items = q.data ?? [];
  const unread = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  const markOne = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-notifications", user?.id] }),
  });

  const markAll = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Todas as notificações marcadas como lidas");
      qc.invalidateQueries({ queryKey: ["my-notifications", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-notifications", user?.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Notificações</h1>
            <p className="text-sm text-muted-foreground">
              {unread > 0 ? `${unread} não lida(s)` : "Você está em dia"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/diagnostico-push"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              title="Diagnóstico de notificações"
            >
              <Stethoscope className="h-4 w-4" />
              <span className="hidden sm:inline">Diagnóstico</span>
            </Link>
            <button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending || unread === 0}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50 hover:bg-muted"
            >
              <CheckCheck className="h-4 w-4" /> Marcar todas
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {q.isLoading && (
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Carregando…
            </div>
          )}

          {!q.isLoading && items.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <BellOff className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <div className="text-sm text-muted-foreground">Nenhuma notificação por aqui ainda.</div>
            </div>
          )}

          {items.map((n) => (
            <article
              key={n.id}
              className={`rounded-2xl border p-4 flex gap-3 items-start transition ${
                n.is_read ? "bg-card border-border" : "bg-emerald-50/60 border-emerald-200"
              }`}
            >
              <div
                className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${
                  n.is_read ? "bg-muted text-muted-foreground" : "bg-emerald-500 text-white"
                }`}
              >
                <Bell className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground truncate">{n.title}</h3>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatWhen(n.created_at)}</span>
                </div>
                {n.body && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{n.body}</p>}
                {n.image_url && (
                  <img
                    src={n.image_url}
                    alt=""
                    className="mt-2 rounded-lg max-h-52 w-full object-cover border border-border"
                    onError={(e) => ((e.currentTarget.style.display = "none"))}
                  />
                )}
                <div className="mt-3 flex items-center gap-2">
                  {n.link && (
                    <Link
                      to={n.link.startsWith("/") ? (n.link as never) : "/notificacoes"}
                      onClick={() => !n.is_read && markOne.mutate(n.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Abrir
                    </Link>
                  )}
                  {!n.is_read && (
                    <button
                      onClick={() => markOne.mutate(n.id)}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      Marcar como lida
                    </button>
                  )}
                  <button
                    onClick={() => remove.mutate(n.id)}
                    className="ml-auto inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                  >
                    <Trash2 className="h-3 w-3" /> Excluir
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}