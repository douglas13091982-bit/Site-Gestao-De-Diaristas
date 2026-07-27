import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommissionPct, computePayout } from "@/hooks/use-commission";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

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

type Withdrawal = {
  id: number;
  amount: number;
  status: string;
  pix_key: string;
  pix_key_type: string | null;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
};

function CarteiraPage() {
  const { user } = useAuth();
  const pct = useCommissionPct();
  const qc = useQueryClient();

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

  const profileQ = useQuery({
    queryKey: ["pro-profile-pix", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("pix_key,pix_key_type").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const withdrawalsQ = useQuery({
    queryKey: ["pro-withdrawals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("id,amount,status,pix_key,pix_key_type,admin_notes,created_at,processed_at")
        .eq("professional_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Withdrawal[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`withdrawals-pro-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests", filter: `professional_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["pro-withdrawals", user.id] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  const withdrawals = withdrawalsQ.data ?? [];
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending" || w.status === "approved");
  const pendingSum = pendingWithdrawals.reduce((s, w) => s + Number(w.amount), 0);
  const paidWithdrawals = withdrawals.filter((w) => w.status === "paid").reduce((s, w) => s + Number(w.amount), 0);
  const available = Math.max(0, sum(released) - paidWithdrawals - pendingSum);

  if (q.isLoading) return <p className="text-muted-foreground">Carregando carteira…</p>;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <Card title="A receber" hint="Pagos pelo cliente, aguardando conclusão" value={sum(paidPending)} tone="amber" />
        <Card title="Recebido no mês" hint={now.toLocaleDateString("pt-BR", { month: "long" })} value={sum(monthRows)} tone="emerald" />
        <Card title="Recebido (total)" hint="Serviços concluídos e pagos" value={sum(released)} tone="sky" />
      </section>

      <WithdrawSection
        available={available}
        pixKey={profileQ.data?.pix_key ?? null}
        pixKeyType={profileQ.data?.pix_key_type ?? null}
        withdrawals={withdrawals}
      />

      <p className="text-xs text-muted-foreground">Repasse líquido considera a taxa da plataforma configurada ({pct}%). Pagamentos são liberados após a conclusão do serviço via chave PIX cadastrada no seu perfil.</p>

      <Section title={`A receber (${paidPending.length})`} rows={paidPending} pct={pct} empty="Nenhum serviço aguardando liberação." />
      <Section title={`Próximos / a cobrar (${upcoming.length})`} rows={upcoming} pct={pct} empty="Sem serviços pendentes de pagamento." />
      <Section title={`Histórico recebido (${released.length})`} rows={released} pct={pct} empty="Ainda sem recebimentos." />
    </div>
  );
}

function WithdrawSection({ available, pixKey, pixKeyType, withdrawals }: { available: number; pixKey: string | null; pixKeyType: string | null; withdrawals: Withdrawal[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const value = Number(amount.replace(",", "."));
      if (!Number.isFinite(value) || value <= 0) throw new Error("Informe um valor válido.");
      if (value > available) throw new Error("Valor maior que o saldo disponível.");
      if (!pixKey) throw new Error("Cadastre uma chave PIX no seu perfil antes de solicitar saque.");
      const { data: inserted, error } = await supabase
        .from("withdrawal_requests")
        .insert({
          professional_id: user!.id,
          amount: value,
          pix_key: pixKey,
          pix_key_type: pixKeyType,
          status: "pending",
        })
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (inserted?.id) {
        try {
          const { notifyAdminsWithdrawalRequest } = await import("@/lib/push.functions");
          await notifyAdminsWithdrawalRequest({ data: { withdrawalId: inserted.id as number } });
        } catch (e) {
          console.warn("[withdrawal push] failed", e);
        }
      }
    },
    onSuccess: () => {
      toast.success("Solicitação de saque enviada. O administrador foi notificado.");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["pro-withdrawals", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-2xl border bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center"><Wallet className="h-4 w-4" /></div>
        <div>
          <h2 className="font-semibold text-slate-900">Solicitar saque</h2>
          <p className="text-xs text-muted-foreground">Saldo disponível para saque: <span className="font-bold text-emerald-700">R$ {available.toFixed(2)}</span></p>
        </div>
      </div>
      {!pixKey && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-3">Cadastre sua chave PIX no perfil para poder solicitar saque.</p>}
      <div className="grid gap-2 sm:grid-cols-[1fr,auto]">
        <input type="text" inputMode="decimal" placeholder="Valor (R$)" value={amount} onChange={(e) => setAmount(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm" disabled={!pixKey || create.isPending} />
        <button onClick={() => create.mutate()} disabled={!pixKey || create.isPending || !amount}
          className="rounded-lg bg-emerald-600 text-white text-sm font-semibold px-4 py-2 hover:bg-emerald-700 disabled:opacity-50">
          {create.isPending ? "Enviando…" : "Solicitar saque"}
        </button>
      </div>
      {pixKey && <p className="text-[11px] text-slate-500 mt-2">Será pago via PIX ({pixKeyType || "chave"}): <span className="font-mono">{pixKey}</span></p>}

      {withdrawals.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Minhas solicitações</h3>
          <ul className="grid gap-2">
            {withdrawals.map((w) => (
              <li key={w.id} className="rounded-lg border p-2.5 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium">R$ {Number(w.amount).toFixed(2)}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(w.created_at).toLocaleString("pt-BR")}{w.admin_notes ? ` · ${w.admin_notes}` : ""}</div>
                </div>
                <StatusBadge status={w.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pendente", cls: "bg-amber-100 text-amber-800" },
    approved: { label: "Aprovado", cls: "bg-sky-100 text-sky-800" },
    paid: { label: "Pago", cls: "bg-emerald-100 text-emerald-800" },
    rejected: { label: "Recusado", cls: "bg-rose-100 text-rose-800" },
  };
  const s = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-700" };
  return <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${s.cls}`}>{s.label}</span>;
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