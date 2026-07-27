import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useLeadNotifications, useNotificationPermission } from "@/hooks/use-lead-notifications";
import { toast } from "sonner";
import { useCommissionPct, computePayout } from "@/hooks/use-commission";

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
    client_name: string | null;
    client_phone: string | null;
    status: string;
  } | null;
};

function LeadsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { status: notifStatus, request: requestNotif } = useNotificationPermission();
  const pct = useCommissionPct();

  useLeadNotifications({
    userId: user?.id,
    onNewOffer: () => qc.invalidateQueries({ queryKey: ["my-offers", user?.id] }),
  });

  const offers = useQuery({
    queryKey: ["my-offers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_offers")
        .select("id,status,created_at,booking:bookings(id,service_type,property_type,booking_date,start_time,duration_hours,address,city,notes,total_price,client_email,client_name,client_phone,status)")
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
      return status;
    },
    onSuccess: (status) => {
      qc.invalidateQueries({ queryKey: ["my-offers", user?.id] });
      if (status === "accepted") toast.success("Lead aceito! O cliente foi notificado.");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não foi possível responder ao lead."),
  });

  if (offers.isLoading) return <p className="text-muted-foreground">Carregando leads…</p>;
  const rows = offers.data ?? [];
  const pending = rows.filter((r) => r.status === "pending");
  const history = rows.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-8">
      {notifStatus !== "granted" && notifStatus !== "unsupported" && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">Ative as notificações do navegador</p>
            <p className="text-sm text-muted-foreground">Assim você é avisada na hora que um novo pedido cair — quem aceitar primeiro leva.</p>
          </div>
          <Button onClick={requestNotif}>Ativar notificações</Button>
        </div>
      )}
      <section>
        <h2 className="text-lg font-semibold mb-3">Pendentes ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-muted-foreground text-sm rounded-xl border bg-card p-6">Nenhum lead no momento. Novos pedidos aparecerão aqui automaticamente.</p>
        ) : (
          <ul className="grid gap-3">
            {pending.map((o) => (
              <LeadCard key={o.id} offer={o} pct={pct} onAccept={() => respond.mutate({ id: o.id, status: "accepted" })} onReject={() => respond.mutate({ id: o.id, status: "rejected" })} busy={respond.isPending} />
            ))}
          </ul>
        )}
      </section>
      {history.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Histórico</h2>
          <ul className="grid gap-3">
            {history.map((o) => <LeadCard key={o.id} offer={o} pct={pct} />)}
          </ul>
        </section>
      )}
    </div>
  );
}

function LeadCard({ offer, pct, onAccept, onReject, busy }: { offer: OfferRow; pct: number; onAccept?: () => void; onReject?: () => void; busy?: boolean }) {
  const b = offer.booking;
  const payout = computePayout(b?.total_price, pct);
  const statusColor: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    accepted: "bg-emerald-100 text-emerald-800",
    rejected: "bg-rose-100 text-rose-800",
    expired: "bg-muted text-muted-foreground",
  };
  return (
    <li className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-sm sm:text-base">{b?.service_type ?? "Serviço"} · {b?.property_type ?? "Residência"}</h3>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColor[offer.status] ?? "bg-muted"}`}>{offer.status}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-sm sm:text-base font-bold text-emerald-800">
              📅 {b?.booking_date ? new Date(b.booking_date).toLocaleDateString("pt-BR") : "A combinar"}
            </span>
            {b?.start_time && (
              <span className="inline-flex items-center rounded-lg bg-sky-50 border border-sky-200 px-2.5 py-1 text-sm sm:text-base font-bold text-sky-800">
                🕒 {b.start_time.slice(0,5)}
              </span>
            )}
            {b?.duration_hours && (
              <span className="inline-flex items-center rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-sm sm:text-base font-bold text-amber-800">
                ⏱ {b.duration_hours}h
              </span>
            )}
          </div>
          {b?.address && <p className="text-xs sm:text-sm mt-2 break-words text-muted-foreground">{b.address}{b.city ? ` — ${b.city}` : ""}</p>}
          {b?.notes && <p className="text-xs sm:text-sm text-muted-foreground mt-2 italic break-words">"{b.notes}"</p>}
        </div>
        <div className="text-right shrink-0">
          {b?.total_price ? (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Você recebe</div>
              <div className="font-extrabold text-2xl sm:text-3xl text-emerald-600 whitespace-nowrap leading-tight">R$ {payout.toFixed(2)}</div>
            </div>
          ) : null}
        </div>
      </div>
      {offer.status === "accepted" && b && (
        <div className="mt-4 pt-4 border-t rounded-lg bg-emerald-50/50 -mx-1 px-3 py-3">
          <div className="text-[11px] uppercase tracking-wide text-emerald-700 font-semibold mb-1">Contato do cliente</div>
          {b.client_name && <div className="text-sm font-medium">{b.client_name}</div>}
          {b.client_phone && (
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-sm">{b.client_phone}</span>
              <a
                href={`https://wa.me/55${b.client_phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-2 py-1 rounded-full bg-emerald-600 text-white font-medium"
              >
                WhatsApp
              </a>
            </div>
          )}
          {b.client_email && <div className="text-xs text-muted-foreground mt-1 break-all">{b.client_email}</div>}
        </div>
      )}
      {offer.status === "pending" && onAccept && onReject && (
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button onClick={onAccept} disabled={busy} className="flex-1 min-h-11">Aceitar</Button>
          <Button onClick={onReject} disabled={busy} variant="outline" className="flex-1 min-h-11">Recusar</Button>
        </div>
      )}
    </li>
  );
}