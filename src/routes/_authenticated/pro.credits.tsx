import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pro/credits")({
  component: CreditsPage,
});

const PACKAGES = [
  { credits: 20, price: 20, label: "Inicial" },
  { credits: 50, price: 45, label: "Popular", highlight: true },
  { credits: 100, price: 85, label: "Pro" },
  { credits: 200, price: 160, label: "Premium" },
];

function CreditsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [custom, setCustom] = useState<number>(30);

  const profile = useQuery({
    queryKey: ["me-profile-credits", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("profiles").select("credits_balance,pix_key").eq("id", user!.id).maybeSingle()).data,
  });

  const tx = useQuery({
    queryKey: ["credit-tx", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("credit_transactions")
          .select("id,type,amount,description,status,created_at")
          .eq("professional_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(50)
      ).data ?? [],
  });

  const purchase = useMutation({
    mutationFn: async ({ credits, price }: { credits: number; price: number }) => {
      const { error } = await supabase.from("credit_transactions").insert({
        professional_id: user!.id,
        type: "purchase",
        amount: credits,
        description: `Compra de ${credits} créditos — R$ ${price.toFixed(2)}`,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação de compra criada. Aguarde a confirmação do pagamento.");
      qc.invalidateQueries({ queryKey: ["credit-tx"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar compra"),
  });

  const summary = useMemo(() => {
    const rows = tx.data ?? [];
    const completed = rows.filter((r) => r.status === "completed");
    const inflow = completed.filter((r) => Number(r.amount) > 0).reduce((s, r) => s + Number(r.amount), 0);
    const outflow = completed.filter((r) => Number(r.amount) < 0).reduce((s, r) => s + Number(r.amount), 0);
    const pending = rows.filter((r) => r.status === "pending").length;
    return { inflow, outflow: Math.abs(outflow), pending };
  }, [tx.data]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Saldo atual" value={`R$ ${Number(profile.data?.credits_balance ?? 0).toFixed(2)}`} accent />
        <Card title="Total comprado" value={`${summary.inflow.toFixed(0)} cr`} />
        <Card title="Total gasto" value={`${summary.outflow.toFixed(0)} cr`} />
        <Card title="Pendentes" value={String(summary.pending)} />
      </div>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-bold">Comprar créditos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cada crédito equivale a R$ 1. Use créditos para desbloquear leads de clientes na sua região.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-5">
          {PACKAGES.map((p) => (
            <div
              key={p.credits}
              className={`rounded-lg border p-4 flex flex-col ${p.highlight ? "border-primary bg-primary/5" : ""}`}
            >
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{p.label}</div>
              <div className="text-2xl font-bold mt-1">{p.credits} créditos</div>
              <div className="text-sm text-muted-foreground">R$ {p.price.toFixed(2)}</div>
              {p.price < p.credits && (
                <div className="text-xs text-primary mt-1">
                  Economize R$ {(p.credits - p.price).toFixed(2)}
                </div>
              )}
              <button
                onClick={() => purchase.mutate({ credits: p.credits, price: p.price })}
                disabled={purchase.isPending}
                className="mt-4 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                Comprar
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-3 border-t pt-5">
          <div>
            <label className="text-xs text-muted-foreground">Quantia personalizada</label>
            <input
              type="number"
              min={1}
              value={custom}
              onChange={(e) => setCustom(Math.max(1, Number(e.target.value) || 0))}
              className="mt-1 block h-10 w-40 rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <button
            onClick={() => purchase.mutate({ credits: custom, price: custom })}
            disabled={purchase.isPending || custom < 1}
            className="h-10 rounded-md border px-4 text-sm font-medium disabled:opacity-50"
          >
            Comprar {custom} créditos (R$ {custom.toFixed(2)})
          </button>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Extrato</h2>
          <span className="text-xs text-muted-foreground">Últimos 50 lançamentos</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-2 pr-4">Data</th>
                <th className="py-2 pr-4">Descrição</th>
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {tx.isLoading && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Carregando…</td></tr>
              )}
              {tx.data && tx.data.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Nenhuma movimentação ainda.</td></tr>
              )}
              {tx.data?.map((r) => {
                const amount = Number(r.amount);
                const positive = amount >= 0;
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="py-2 pr-4">{r.description ?? "—"}</td>
                    <td className="py-2 pr-4 capitalize">{r.type}</td>
                    <td className="py-2 pr-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs ${statusClass(r.status)}`}>{statusLabel(r.status)}</span>
                    </td>
                    <td className={`py-2 pr-4 text-right font-medium ${positive ? "text-emerald-600" : "text-red-600"}`}>
                      {positive ? "+" : ""}{amount.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Card({ title, value, accent }: { title: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}>
      <div className={`text-xs ${accent ? "opacity-80" : "text-muted-foreground"}`}>{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function statusLabel(s: string) {
  return s === "completed" ? "Confirmado" : s === "pending" ? "Pendente" : s === "failed" ? "Falhou" : s;
}
function statusClass(s: string) {
  if (s === "completed") return "bg-emerald-100 text-emerald-700";
  if (s === "pending") return "bg-amber-100 text-amber-700";
  if (s === "failed") return "bg-red-100 text-red-700";
  return "bg-muted text-foreground";
}