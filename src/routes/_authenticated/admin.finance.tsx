import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, StatCard, useAdminStats } from "./admin";
import { DollarSign, TrendingUp, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/finance")({
  component: FinancePage,
});

function FinancePage() {
  const s = useAdminStats();
  const d = s.data;
  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <div className="p-4 md:p-8">
      <AdminPageHeader title="Receita & Comissão" subtitle="Resumo financeiro da plataforma" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Receita Bruta" value={fmt(d?.revenue ?? 0)} icon={DollarSign} color="bg-orange-500" />
        <StatCard label={`Comissão (${d?.commissionPct ?? 20}%)`} value={fmt(d?.commission ?? 0)} icon={TrendingUp} color="bg-emerald-500" />
        <StatCard label="Repasse Diaristas" value={fmt((d?.revenue ?? 0) - (d?.commission ?? 0))} icon={Wallet} color="bg-blue-500" />
      </div>
      <p className="mt-6 text-sm text-slate-500">Base: agendamentos com status <b>completed</b>.</p>
    </div>
  );
}