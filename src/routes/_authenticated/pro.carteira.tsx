import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useCommissionPct, computePayout } from "@/hooks/use-commission";

export const Route = createFileRoute("/_authenticated/pro/carteira")({
  head: () => ({ meta: [{ title: "Carteira — Gersepa Solutions" }, { name: "description", content: "Seus recebíveis e histórico de pagamentos." }] }),
  component: CarteiraPage,
});

type Row = {
  id: number;
  service_type: string | null;
  booking_date: string | null;
  status: string;
  payment_status: string | null;
  total_price: number | null;
  paid_at: string | null;
};

function CarteiraPage() {
  const { user } = useAuth();
  const pct = useCommissionPct();

  const q = useQuery({
    queryKey: ["pro-wallet", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id,service_type,booking_date,status,payment_status,total_price,paid_at")
        .eq("professional_id", user!.id)
        .order("booking_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const rows = q.data ?? [];
  const paidPending = rows.filter((r) => r.payment_status === "paid" && r.status !== "completed" && r.status !== "cancelled");
  const released = rows.filter((r) => r.status === "completed" && r.payment_status === "paid");
  const upcoming = rows.filter((r) => r.payment_status !== "paid" && r.status !== "cancelled");

  const sum = (list: Row[]) => list.reduce((acc, r) => acc + computePayout(r.total_price, pct), 0);
  const now = new Date();
  const monthRows = released.filter((r) => {
    const d = r.paid_at ? new Date(r.paid_at) : r.booking_date ? new Date(r.booking_date) : null;
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  if (q.isLoading) return <p className="text-muted-foreground">Carregando carteira…</p>;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <Card title="A receber" hint="Pagos pelo cliente, aguardando conclusão" value={sum(paidPending)} tone="amber" />
        <Card title="Recebido no mês" hint={now.toLocaleDateString("pt-BR", { month: "long" })} value={sum(monthRows)} tone="emerald" />
        <Card title="Recebido (total)" hint="Serviços concluídos e pagos" value={sum(released)} tone="sky" />
      </section>

      <p className="text-xs text-muted-foreground">Repasse líquido considera a taxa da plataforma configurada ({pct}%). Pagamentos são liberados após a conclusão do serviço via chave PIX cadastrada no seu perfil.</p>

      <Section title={`A receber (${paidPending.length})`} rows={paidPending} pct={pct} empty="Nenhum serviço aguardando liberação." />
      <Section title={`Próximos / a cobrar (${upcoming.length})`} rows={upcoming} pct={pct} empty="Sem serviços pendentes de pagamento." />
      <Section title={`Histórico recebido (${released.length})`} rows={released} pct={pct} empty="Ainda sem recebimentos." />
    </div>
  );
}

function Card({ title, hint, value, tone }: { title: string; hint: string; value: number; tone: "amber" | "emerald" | "sky" }) {
  const tones = {
    amber: "from-amber-500 to-amber-600",
    emerald: "from-emerald-500 to-emerald-600",
    sky: "from-sky-500 to-sky-600",
  } as const;
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} text-white p-4 shadow-sm`}>
      <div className="text-xs uppercase tracking-wide opacity-90 font-semibold">{title}</div>
      <div className="text-3xl font-extrabold mt-1">R$ {value.toFixed(2)}</div>
      <div className="text-[11px] opacity-90 mt-1">{hint}</div>
    </div>
  );
}

function Section({ title, rows, pct, empty }: { title: string; rows: Row[]; pct: number; empty: string }) {
  return (
    <section>
      <h2 className="text-base font-semibold mb-2">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-xl border bg-card p-4">{empty}</p>
      ) : (
        <ul className="grid gap-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border bg-card p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{r.service_type ?? "Serviço"}</div>
                <div className="text-xs text-muted-foreground">
                  {r.booking_date ? new Date(r.booking_date).toLocaleDateString("pt-BR") : "Sem data"} · {r.status}
                  {r.payment_status ? ` · pgto ${r.payment_status}` : ""}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-extrabold text-emerald-700 whitespace-nowrap">R$ {computePayout(r.total_price, pct).toFixed(2)}</div>
                <div className="text-[10px] text-muted-foreground">líquido</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}