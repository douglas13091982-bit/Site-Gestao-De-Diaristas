import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { Calendar, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({ meta: [{ title: "Meus agendamentos — Gersepa" }, { name: "description", content: "Acompanhe seus agendamentos." }] }),
  component: BookingsPage,
});

const STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Aguardando", color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmado", color: "bg-emerald-100 text-emerald-700" },
  in_progress: { label: "Em andamento", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluído", color: "bg-slate-200 text-slate-700" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700" },
};

function BookingsPage() {
  const { user } = useAuth();
  const q = useQuery({
    enabled: !!user,
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => (await supabase.from("bookings")
      .select("id, service_type, city, address, booking_date, start_time, duration_hours, status, total_price, professional_id")
      .or(`client_id.eq.${user!.id},client_email.eq.${user!.email}`)
      .order("booking_date", { ascending: false }).limit(50)).data ?? [],
  });
  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Meus agendamentos</h1>
            <p className="text-muted-foreground">Acompanhe suas solicitações e serviços.</p>
          </div>
          <Link to="/agendamento-rapido" className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">Novo agendamento</Link>
        </div>
        {q.isLoading && <div className="text-muted-foreground">Carregando…</div>}
        {!q.isLoading && !q.data?.length && <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">Você ainda não tem agendamentos. <Link to="/agendamento-rapido" className="text-primary font-semibold ml-1">Criar o primeiro</Link>.</div>}
        <ul className="space-y-3">
          {q.data?.map((b) => {
            const s = STATUS[b.status] ?? { label: b.status, color: "bg-slate-100 text-slate-700" };
            return (
              <li key={b.id} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold capitalize">{b.service_type ?? "Serviço"}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{b.booking_date} · {b.start_time?.slice(0,5)} · {b.duration_hours}h</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{b.city} — {b.address}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${s.color}`}>{s.label}</span>
                    {b.total_price != null && <div className="mt-2 font-bold text-primary">R$ {Number(b.total_price).toFixed(2)}</div>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}