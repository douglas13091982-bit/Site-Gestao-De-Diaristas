import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/appearance")({
  component: () => (
    <div className="p-8">
      <AdminPageHeader title="Aparência" subtitle="Personalize identidade visual" />
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">Em breve: cores, logo, favicon e tipografia.</div>
    </div>
  ),
});