import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/bookings/new")({
  component: NewBooking,
});

function NewBooking() {
  const nav = useNavigate();
  const [form, setForm] = useState({ client_email: "", booking_date: "", city: "", total_price: "", duration_hours: "4" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    const { error } = await supabase.from("bookings").insert({
      client_email: form.client_email,
      booking_date: form.booking_date,
      city: form.city,
      total_price: Number(form.total_price || 0),
      duration_hours: Number(form.duration_hours || 4),
      status: "pending",
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    nav({ to: "/admin/bookings" });
  };
  return (
    <div className="p-8 max-w-2xl">
      <AdminPageHeader title="Novo Agendamento" subtitle="Criar reserva manualmente" />
      <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <Field label="Email do cliente"><Input required type="email" value={form.client_email} onChange={e => setForm({...form, client_email: e.target.value})} /></Field>
        <Field label="Data"><Input required type="date" value={form.booking_date} onChange={e => setForm({...form, booking_date: e.target.value})} /></Field>
        <Field label="Cidade"><Input required value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Duração (horas)"><Input required type="number" min={1} value={form.duration_hours} onChange={e => setForm({...form, duration_hours: e.target.value})} /></Field>
          <Field label="Valor (R$)"><Input required type="number" step="0.01" value={form.total_price} onChange={e => setForm({...form, total_price: e.target.value})} /></Field>
        </div>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Criar agendamento"}</Button>
      </form>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-semibold text-slate-600 block mb-1">{label}</span>{children}</label>;
}