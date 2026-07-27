import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: () => (
    <div className="p-4 md:p-8">
      <AdminPageHeader title="Relatórios" subtitle="Exportações e análises detalhadas" />
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">Em breve: exportação CSV, gráficos de crescimento e ranking de profissionais.</div>
    </div>
  ),
});