import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardModuleGrid, DashboardQuickAction, type DashboardModule } from "@/components/DashboardModuleGrid";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Calendar, MapPin, Sparkles, Users, User, Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cliente/")({
  head: () => ({ meta: [{ title: "Início — Minha conta Gersepa" }, { name: "description", content: "Resumo dos seus agendamentos." }] }),
  component: ClienteHome,
});

const STATUS: Record<string, { label: string; color: string }> = {
  pending:     { label: "Aguardando", color: "bg-amber-100 text-amber-700" },
  confirmed:   { label: "Confirmado", color: "bg-emerald-100 text-emerald-700" },
  in_progress: { label: "Em andamento", color: "bg-blue-100 text-blue-700" },
  completed:   { label: "Concluído", color: "bg-slate-200 text-slate-700" },
  cancelled:   { label: "Cancelado", color: "bg-red-100 text-red-700" },
};

const CLIENT_MODULES = [
  { to: "/agendamento-rapido", label: "Agendamento rápido", icon: Sparkles, primary: true },
  { to: "/professionals", label: "Escolher profissional", icon: Users },
  { to: "/cliente/agendamentos", label: "Meus agendamentos", icon: Calendar },
  { to: "/cliente/perfil", label: "Meu perfil", icon: User },
] satisfies DashboardModule[];

function ClienteHome() {
  const { user } = useAuth();
  const profile = useQuery({
    enabled: !!user,
    queryKey: ["cliente-home-profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("city").eq("id", user!.id).maybeSingle()).data,
  });

  const q = useQuery({
    enabled: !!user,
    queryKey: ["cliente-home-bookings", user?.id],
    queryFn: async () => (await supabase.from("bookings")
      .select("id, service_type, city, address, booking_date, start_time, duration_hours, status, total_price")
      .or(`client_id.eq.${user!.id},client_email.eq.${user!.email}`)
      .order("booking_date", { ascending: false }).limit(3)).data ?? [],
  });

  const cityLabel = profile.data?.city || "sua cidade";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm text-muted-foreground">Serviços em</div>
        <div className="break-words text-xl font-bold">{cityLabel}</div>
      </div>
      <DashboardModuleGrid label="Menu do cliente" modules={CLIENT_MODULES} />

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Últimos agendamentos</h2>
          <Link to="/cliente/agendamentos" className="text-sm font-semibold text-primary">Ver todos</Link>
        </div>
        {q.isLoading && <div className="text-muted-foreground text-sm">Carregando…</div>}
        {!q.isLoading && !q.data?.length && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Você ainda não tem agendamentos.
          </div>
        )}
        <ul className="space-y-2">
          {q.data?.map((b) => {
            const s = STATUS[b.status] ?? { label: b.status, color: "bg-slate-100 text-slate-700" };
            return (
              <li key={b.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold capitalize truncate">{b.service_type ?? "Serviço"}</div>
                    <div className="text-xs text-muted-foreground mt-1 space-y-1">
                      <div className="flex items-center gap-1"><Calendar className="h-3 w-3 shrink-0" />{b.booking_date} · {b.start_time?.slice(0,5)} · {b.duration_hours}h</div>
                      <div className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{b.city} — {b.address}</span></div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${s.color}`}>{s.label}</span>
                    {b.total_price != null && <div className="mt-2 font-bold text-primary text-sm">R$ {Number(b.total_price).toFixed(2)}</div>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <DashboardQuickAction to="/notificacoes" label="Notificações" icon={Bell} />
    </div>
  );
}
