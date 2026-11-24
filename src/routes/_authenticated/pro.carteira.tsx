import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommissionPct, computePayout } from "@/hooks/use-commission";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ArrowUpRight, ChevronDown, Clock3, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
};

type Withdrawal = {
  id: number;
  amount: number;
  status: string;
  admin_notes: string | null;
  created_at: string;
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
        .select("id,service_type,booking_date,status,payment_status,total_price")
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
        .select("id,amount,status,admin_notes,created_at")
        .eq("professional_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Withdrawal[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`wallet-pro-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `professional_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["pro-wallet", user.id] }))
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

  if (q.isLoading || withdrawalsQ.isLoading || profileQ.isLoading) {
    return <p role="status" className="text-muted-foreground">Carregando carteira…</p>;
  }

  if (q.isError || withdrawalsQ.isError || profileQ.isError) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-muted-foreground">Não foi possível carregar a carteira.</p>
        <Button variant="outline" onClick={() => {
          void Promise.all([q.refetch(), withdrawalsQ.refetch(), profileQ.refetch()]);
        }}>Tentar novamente</Button>
      </div>
    );
  }

  const history = [
    ...released.map((booking) => ({ booking, date: booking.booking_date ?? "", status: "Confirmada", prefix: "+ " })),
    ...upcoming.map((booking) => ({
      booking,
      date: booking.booking_date ?? "",
      status: booking.payment_status === "failed" ? "Pagamento falhou" : "Aguardando pagamento",
      prefix: "",
    })),
    ...withdrawals.map((withdrawal) => ({ withdrawal, date: withdrawal.created_at })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Minha carteira</h2>
      <WithdrawSection available={available} pixKey={profileQ.data?.pix_key ?? null} pixKeyType={profileQ.data?.pix_key_type ?? null} />

      <section className="divide-y rounded-2xl border border-border bg-card" aria-label="Detalhes da carteira">
        <details className="group">
          <summary className="flex min-h-14 list-none items-center gap-3 px-3 py-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"><Clock3 className="size-4" aria-hidden="true" /></span>
            <span className="flex-1 text-sm font-semibold">A liberar</span>
            <strong className="whitespace-nowrap text-sm tabular-nums">{brl(sum(paidPending))}</strong>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="px-3 pb-3">
            <p className="pb-2 text-xs text-muted-foreground">O saldo fica disponível após o cliente confirmar a conclusão.</p>
            {paidPending.length ? (
              <ul className="divide-y border-t">
                {paidPending.map((booking) => <BookingEntry key={booking.id} booking={booking} pct={pct} />)}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Nenhum serviço aguardando liberação.</p>}
          </div>
        </details>
        <details className="group">
          <summary className="flex min-h-14 list-none items-center gap-3 px-3 py-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><ReceiptText className="size-4" aria-hidden="true" /></span>
            <span className="flex-1 text-sm font-semibold">Histórico</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="px-3 pb-3">
            {history.length ? (
              <ul className="divide-y border-t">
                {history.map((entry) => "withdrawal" in entry
                  ? <WithdrawalEntry key={`withdrawal-${entry.withdrawal.id}`} withdrawal={entry.withdrawal} />
                  : <BookingEntry key={`booking-${entry.booking.id}`} booking={entry.booking} pct={pct} status={entry.status} prefix={entry.prefix} />)}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Nenhuma movimentação por enquanto.</p>}
            <p className="pt-2 text-xs text-muted-foreground">Valores líquidos após a taxa da plataforma ({pct}%).</p>
          </div>
        </details>
      </section>
    </div>
  );
}

function WithdrawSection({ available, pixKey, pixKeyType }: { available: number; pixKey: string | null; pixKeyType: string | null }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Faça login para solicitar um saque.");
      const value = Number(amount.trim().replace(",", "."));
      if (!Number.isFinite(value) || value <= 0) throw new Error("Informe um valor válido.");
      if (value > available) throw new Error("Valor maior que o saldo disponível.");
      if (!pixKey) throw new Error("Cadastre uma chave PIX no seu perfil antes de solicitar saque.");
      const { data: inserted, error } = await supabase
        .from("withdrawal_requests")
        .insert({
          professional_id: user.id,
          amount: value,
          pix_key: pixKey,
          pix_key_type: pixKeyType,
          status: "pending",
        })
        .select("id")
        .maybeSingle();
      if (error || !inserted) throw new Error(error?.message ?? "Não foi possível solicitar o saque.");
      if (inserted.id) {
        try {
          const { notifyAdminsWithdrawalRequest } = await import("@/lib/push.functions");
          await notifyAdminsWithdrawalRequest({ data: { withdrawalId: inserted.id as number } });
        } catch (e) {
          console.warn("[withdrawal push] failed", e);
        }
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["pro-withdrawals", user?.id] });
      dialog.current?.close();
      toast.success("Solicitação de saque enviada. O administrador foi notificado.");
      setAmount("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <section aria-label="Saldo disponível" className="space-y-2 rounded-2xl bg-primary p-5 text-primary-foreground shadow-sm">
        <p className="text-sm font-medium">Disponível para saque</p>
        <p className="text-3xl font-extrabold tracking-tight tabular-nums">{brl(available)}</p>
        {pixKey ? (
          <Button
            type="button"
            variant="secondary"
            className="mt-2 min-h-11"
            disabled={available <= 0}
            onClick={() => { setAmount(""); dialog.current?.showModal(); }}
          >
            <ArrowUpRight className="size-4" aria-hidden="true" /> Solicitar saque
          </Button>
        ) : (
          <Button asChild variant="secondary" className="mt-2 min-h-11">
            <Link to="/pro/profile">Cadastrar chave Pix</Link>
          </Button>
        )}
      </section>

      <dialog
        ref={dialog}
        aria-labelledby="withdraw-title"
        className="m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xl backdrop:bg-black/50"
        onCancel={(event) => { if (create.isPending) event.preventDefault(); }}
      >
        <form className="space-y-3" onSubmit={(event) => {
          event.preventDefault();
          if (!create.isPending) create.mutate();
        }}>
          <div>
            <h2 id="withdraw-title" className="text-lg font-bold">Solicitar saque</h2>
            <p className="text-sm text-muted-foreground">Saldo disponível de {brl(available)}</p>
          </div>
          <label htmlFor="withdraw-amount" className="block text-sm font-medium">Valor do saque em reais</label>
          <Input id="withdraw-amount" type="text" inputMode="decimal" placeholder="0,00" value={amount}
            onChange={(event) => setAmount(event.target.value)} required autoFocus disabled={create.isPending} className="min-h-11 text-base" />
          {pixKey && <p className="text-xs text-muted-foreground">Pix cadastrado · •••• {pixKey.slice(-4)}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={create.isPending} onClick={() => dialog.current?.close()}>Voltar</Button>
            <Button type="submit" disabled={!pixKey || create.isPending || !amount.trim()}>
              {create.isPending ? "Enviando…" : "Confirmar saque"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "America/Sao_Paulo" });

function brl(value: number) {
  return currency.format(value);
}

function formatDate(date: string | null) {
  if (!date) return "Sem data";
  const value = new Date(date.length === 10 ? `${date}T12:00:00Z` : date);
  return Number.isNaN(value.getTime()) ? "Sem data" : shortDate.format(value);
}

function BookingEntry({ booking, pct, status, prefix = "" }: { booking: Row; pct: number; status?: string; prefix?: string }) {
  return (
    <li className="flex items-start justify-between gap-2 py-2.5 text-sm">
      <div className="min-w-0">
        <div className="break-words font-medium">{booking.service_type ?? "Serviço"} · {formatDate(booking.booking_date)}</div>
        {status && <div className="text-xs text-muted-foreground">{status}</div>}
      </div>
      <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums">{prefix}{brl(computePayout(booking.total_price, pct))}</span>
    </li>
  );
}

const withdrawalLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  paid: "Pago",
  rejected: "Recusado",
};

function WithdrawalEntry({ withdrawal }: { withdrawal: Withdrawal }) {
  return (
    <li className="flex items-start justify-between gap-2 py-2.5 text-sm">
      <div className="min-w-0">
        <div className="font-medium">Saque Pix · {formatDate(withdrawal.created_at)}</div>
        <div className="break-words text-xs text-muted-foreground">
          {withdrawalLabels[withdrawal.status] ?? "Em análise"}
          {withdrawal.admin_notes && ` · ${withdrawal.admin_notes}`}
        </div>
      </div>
      <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums">
        {withdrawal.status === "paid" ? "− " : ""}{brl(Number(withdrawal.amount))}
      </span>
    </li>
  );
}
