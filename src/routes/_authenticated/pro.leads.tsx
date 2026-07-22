import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/pro/leads")({
  component: LeadsPage,
});

type OfferRow = {
  id: number;
  status: string;
  created_at: string;
  booking: {
    id: number;
    service_type: string | null;
    property_type: string | null;
    booking_date: string | null;
    start_time: string | null;
    duration_hours: number | null;
    address: string | null;
    city: string | null;
    notes: string | null;
    total_price: number | null;
    client_email: string | null;
    status: string;
  } | null;
};

function LeadsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const offers = useQuery({
    queryKey: ["my-offers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_offers")
        .select("id,status,created_at,booking:bookings(id,service_type,property_type,booking_date,start_time,duration_hours,address,city,notes,total_price,client_email,status)")
        .eq("professional_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OfferRow[];
    },
  });

  const respond = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "accepted" | "rejected" }) => {
      const { error } = await supabase.from("booking_offers").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-offers", user?.id] }),
  });

  if (offers.isLoading) return <p className="text-muted-foreground">Carregando leads…</p>;
  const rows = offers.data ?? [];
  const pending = rows.filter((r) => r.status === "pending");
  const history = rows.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-3">Pendentes ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-muted-foreground text-sm rounded-xl border bg-card p-6">Nenhum lead no momento. Novos pedidos aparecerão aqui automaticamente.</p>
        ) : (
          <ul className="grid gap-3">
            {pending.map((o) => (
              <LeadCard key={o.id} offer={o} onAccept={() => respond.mutate({ id: o.id, status: "accepted" })} onReject={() => respond.mutate({ id: o.id, status: "rejected" })} busy={respond.isPending} />
            ))}
          </ul>
        )}
      </section>
      {history.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Histórico</h2>
          <ul className="grid gap-3">
            {history.map((o) => <LeadCard key={o.id} offer={o} />)}
          </ul>
        </section>
      )}
    </div>
  );
}

function LeadCard({ offer, onAccept, onReject, busy }: { offer: OfferRow; onAccept?: () => void; onReject?: () => void; busy?: boolean }) {
  const b = offer.booking;
  const statusColor: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    accepted: "bg-emerald-100 text-emerald-800",
    rejected: "bg-rose-100 text-rose-800",
    expired: "bg-muted text-muted-foreground",
  };
  return (
    <li className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{b?.service_type ?? "Serviço"} · {b?.property_type ?? "Residência"}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[offer.status] ?? "bg-muted"}`}>{offer.status}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {b?.booking_date ? new Date(b.booking_date).toLocaleDateString("pt-BR") : "Data a combinar"}
            {b?.start_time ? ` às ${b.start_time}` : ""}
            {b?.duration_hours ? ` · ${b.duration_hours}h` : ""}
          </p>
          {b?.address && <p className="text-sm mt-1">{b.address}{b.city ? ` — ${b.city}` : ""}</p>}
          {b?.notes && <p className="text-sm text-muted-foreground mt-2 italic">"{b.notes}"</p>}
        </div>
        <div className="text-right">
          {b?.total_price && <div className="font-bold text-lg text-primary">R$ {Number(b.total_price).toFixed(2)}</div>}
          {offer.status === "accepted" && b?.client_email && <div className="text-xs text-muted-foreground mt-1">{b.client_email}</div>}
        </div>
      </div>
      {offer.status === "pending" && onAccept && onReject && (
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button onClick={onAccept} disabled={busy} className="flex-1">Aceitar lead</Button>
          <Button onClick={onReject} disabled={busy} variant="outline" className="flex-1">Recusar</Button>
        </div>
      )}
    </li>
  );
}