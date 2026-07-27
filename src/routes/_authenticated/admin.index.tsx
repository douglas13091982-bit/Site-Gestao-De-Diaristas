import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader, StatCard, useAdminStats } from "./admin";
import { Users, Briefcase, Calendar, DollarSign, Star, Clock, CheckCircle2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const s = useAdminStats();
  const recent = useQuery({
    queryKey: ["admin-recent"],
    queryFn: async () => {
      const [bks, rvs] = await Promise.all([
        supabase.from("bookings").select("id,status,total_price,booking_date,client_email").order("created_at",{ascending:false}).limit(6),
        supabase.from("reviews").select("id,rating,comment,created_at").order("created_at",{ascending:false}).limit(6),
      ]);
      return { bookings: bks.data ?? [], reviews: rvs.data ?? [] };
    },
  });
  const d = s.data;
  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="p-4 md:p-8">
      <AdminPageHeader title="Visão Geral" subtitle="Métricas e estatísticas da plataforma" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Usuários" value={d?.totalUsers ?? "—"} icon={Users} color="bg-blue-500" />
        <StatCard label="Profissionais" value={d?.totalPros ?? "—"} icon={Briefcase} color="bg-emerald-500" />
        <StatCard label="Agendamentos" value={d?.totalBookings ?? "—"} icon={Calendar} color="bg-purple-500" />
        <StatCard label="Receita Total" value={fmt(d?.revenue ?? 0)} icon={DollarSign} color="bg-orange-500" />
        <StatCard label={`Comissão (${d?.commissionPct ?? 20}%)`} value={fmt(d?.commission ?? 0)} icon={DollarSign} color="bg-emerald-600" />
        <StatCard label="Avaliações" value={d?.reviews ?? 0} icon={Star} color="bg-pink-500" />
        <StatCard label="Pendentes" value={d?.pending ?? 0} icon={Clock} color="bg-blue-400" />
        <StatCard label="Concluídos" value={d?.completed ?? 0} icon={CheckCircle2} color="bg-emerald-500" />
        <StatCard label="Nota Média" value={(d?.avgRating ?? 0).toFixed(1)} icon={TrendingUp} color="bg-indigo-500" />
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="destructive" size="sm">Zerar Receita</Button>
        <Button variant="destructive" size="sm">Zerar Comissão</Button>
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <Panel title="Agendamentos Recentes">
          {recent.data?.bookings.length ? (
            <ul className="divide-y divide-slate-100">
              {recent.data.bookings.map(b => (
                <li key={b.id} className="py-3 flex justify-between text-sm">
                  <div>
                    <div className="font-medium text-slate-800">{b.client_email ?? "—"}</div>
                    <div className="text-xs text-slate-500">{b.booking_date} · {b.status}</div>
                  </div>
                  <div className="font-semibold text-slate-900">{fmt(Number(b.total_price ?? 0))}</div>
                </li>
              ))}
            </ul>
          ) : <Empty>Sem agendamentos ainda.</Empty>}
        </Panel>
        <Panel title="Avaliações Recentes">
          {recent.data?.reviews.length ? (
            <ul className="divide-y divide-slate-100">
              {recent.data.reviews.map(r => (
                <li key={r.id} className="py-3 text-sm">
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({length: r.rating}).map((_,i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                  </div>
                  {r.comment && <div className="text-slate-600 mt-1">{r.comment}</div>}
                </li>
              ))}
            </ul>
          ) : <Empty>Sem avaliações ainda.</Empty>}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="font-bold text-slate-900 mb-3">{title}</h2>
      {children}
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-slate-500 py-6 text-center">{children}</div>;
}