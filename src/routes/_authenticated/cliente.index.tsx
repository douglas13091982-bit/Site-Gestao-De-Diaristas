import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Calendar, MapPin, Sparkles, Plus } from "lucide-react";

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

function ClienteHome() {
  const { user } = useAuth();
  const q = useQuery({
    enabled: !!user,
    queryKey: ["cliente-home-bookings", user?.id],
    queryFn: async () => (await supabase.from("bookings")
      .select("id, service_type, city, address, booking_date, start_time, duration_hours, status, total_price")
      .or(`client_id.eq.${user!.id},client_email.eq.${user!.email}`)
      .order("booking_date", { ascending: false }).limit(3)).data ?? [],
  });

  return (
    <div className="space-y-4">
      <Link to="/agendamento-rapido" className="block rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-white/15 grid place-items-center shrink-0"><Sparkles className="h-6 w-6" /></div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-lg">Agendar diarista</div>
            <div className="text-xs opacity-90">Escolha data, hora e endereço em poucos toques</div>
          </div>
          <Plus className="h-6 w-6 shrink-0" />
        </div>
      </Link>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Últimos agendamentos</h2>
          <Link to="/cliente/agendamentos" className="text-sm font-semibold text-primary">Ver todos</Link>
        </div>
        {q.isLoading && <div className="text-muted-foreground text-sm">Carregando…</div>}
        {!q.isLoading && !q.data?.length && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Você ainda não tem agendamentos.
            <div className="mt-3"><Link to="/agendamento-rapido" className="inline-flex h-10 items-center px-4 rounded-md bg-primary text-primary-foreground font-semibold">Criar o primeiro</Link></div>
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
    </div>
  );
}