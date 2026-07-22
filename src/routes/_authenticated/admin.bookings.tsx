import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/bookings")({
  component: BookingsLayout,
});

function BookingsLayout() {
  const path = useRouterState({ select: s => s.location.pathname });
  if (path !== "/admin/bookings") return <Outlet />;
  return <BookingsList />;
}

function BookingsList() {
  const q = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => (await supabase.from("bookings").select("id,client_email,booking_date,status,total_price,payment_status,city").order("created_at",{ascending:false}).limit(200)).data ?? [],
  });
  return (
    <div className="p-8">
      <AdminPageHeader title="Agendamentos" subtitle="Todas as reservas da plataforma" />
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr><th className="text-left p-3">Cliente</th><th className="text-left p-3">Data</th><th className="text-left p-3">Cidade</th><th className="text-left p-3">Valor</th><th className="text-left p-3">Status</th><th className="text-left p-3">Pagamento</th></tr>
          </thead>
          <tbody>
            {(q.data ?? []).map(b => (
              <tr key={b.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{b.client_email ?? "—"}</td>
                <td className="p-3 text-slate-600">{b.booking_date ?? "—"}</td>
                <td className="p-3 text-slate-600">{b.city ?? "—"}</td>
                <td className="p-3 font-semibold">R$ {Number(b.total_price ?? 0).toFixed(2)}</td>
                <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">{b.status}</span></td>
                <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">{b.payment_status ?? "—"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {q.data?.length === 0 && <div className="p-6 text-center text-slate-500">Nenhum agendamento.</div>}
      </div>
    </div>
  );
}