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
    queryFn: async () => (await supabase
      .from("bookings")
      .select("id,client_email,booking_date,status,total_price,payment_status,city,professional_id,professional:profiles!bookings_professional_id_fkey(full_name,profile_photo)")
      .order("created_at",{ascending:false})
      .limit(200)).data ?? [],
  });
  return (
    <div className="p-4 md:p-8">
      <AdminPageHeader title="Agendamentos" subtitle="Todas as reservas da plataforma" />
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr><th className="text-left p-3">Cliente</th><th className="text-left p-3">Diarista</th><th className="text-left p-3">Data</th><th className="text-left p-3">Cidade</th><th className="text-left p-3">Valor</th><th className="text-left p-3">Status</th><th className="text-left p-3">Pagamento</th></tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((b: any) => (
              <tr key={b.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{b.client_email ?? "—"}</td>
                <td className="p-3">
                  {b.professional?.full_name ? (
                    <div className="flex items-center gap-2">
                      {b.professional.profile_photo ? (
                        <img src={b.professional.profile_photo} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-semibold">
                          {b.professional.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-slate-700">{b.professional.full_name}</span>
                    </div>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Aguardando</span>
                  )}
                </td>
                <td className="p-3 text-slate-600">{b.booking_date ?? "—"}</td>
                <td className="p-3 text-slate-600">{b.city ?? "—"}</td>
                <td className="p-3 font-semibold">R$ {Number(b.total_price ?? 0).toFixed(2)}</td>
                <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">{b.status}</span></td>
                <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">{b.payment_status ?? "—"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {q.data?.length === 0 && <div className="p-6 text-center text-slate-500">Nenhum agendamento.</div>}
      </div>
    </div>
  );
}