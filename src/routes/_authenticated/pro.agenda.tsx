import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { cancelPaidProfessionalBooking } from "@/lib/push.functions";
import { useCommissionPct, computePayout } from "@/hooks/use-commission";
import { toast } from "sonner";
import { BOOKING_SHIFTS } from "@/shared/lib/booking-shifts";
import { Clock3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pro/agenda")({
  component: AgendaPage,
});

const BOOKING_STATUS: Record<string, string> = {
  pending: "Aguardando confirmação",
  awaiting_payment: "Aguardando pagamento",
  confirmed: "Confirmado",
  in_progress: "Em andamento",
  awaiting_client_confirmation: "Aguardando confirmação do cliente",
};

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const PERIODS = [
  { value: "off", label: "Não atende", start: BOOKING_SHIFTS[0].start, end: BOOKING_SHIFTS[1].end },
  { value: "morning", label: BOOKING_SHIFTS[0].label, start: BOOKING_SHIFTS[0].start, end: BOOKING_SHIFTS[0].end },
  { value: "afternoon", label: BOOKING_SHIFTS[1].label, start: BOOKING_SHIFTS[1].start, end: BOOKING_SHIFTS[1].end },
  { value: "all", label: "Manhã e tarde", start: BOOKING_SHIFTS[0].start, end: BOOKING_SHIFTS[1].end },
] as const;

type Period = (typeof PERIODS)[number];

function AgendaPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const pct = useCommissionPct();

  const bookings = useQuery({
    queryKey: ["pro-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("bookings")
        .select("id,service_type,booking_date,start_time,duration_hours,address,city,status,payment_status,total_price,client_email")
        .eq("professional_id", user!.id)
        .order("booking_date", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user?.id) return;
    const professionalId = user.id;
    const channel = supabase.channel(`agenda-bookings-${professionalId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "bookings",
        filter: `professional_id=eq.${professionalId}`,
      }, () => { void qc.invalidateQueries({ queryKey: ["pro-bookings", professionalId] }); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc, user?.id]);

  const avail = useQuery({
    queryKey: ["my-avail", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("professional_availability").select("*").eq("professional_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const blocked = useQuery({
    queryKey: ["my-blocked", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("professional_blocked_dates").select("*").eq("professional_id", user!.id).order("blocked_date")).data ?? [],
  });

  const availabilityByDay = new Map(avail.data?.map((row) => [row.day_of_week, row]));

  const savePeriod = useMutation({
    mutationFn: async ({ day, period }: { day: number; period: Period }) => {
      if (!user) throw new Error("Faça login para atualizar sua agenda.");
      const { error } = await supabase.from("professional_availability").upsert({
        professional_id: user.id,
        day_of_week: day,
        start_time: period.start,
        end_time: period.end,
        is_available: period.value !== "off",
      }, { onConflict: "professional_id,day_of_week" });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["my-avail", user?.id] });
      toast.success("Horário de atendimento atualizado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const [blockDate, setBlockDate] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const addBlocked = useMutation({
    mutationFn: async () => {
      if (!user || !blockDate) return;
      await supabase.from("professional_blocked_dates").insert({ professional_id: user.id, blocked_date: blockDate, reason: blockReason || null });
    },
    onSuccess: () => { setBlockDate(""); setBlockReason(""); qc.invalidateQueries({ queryKey: ["my-blocked", user?.id] }); },
  });
  const rmBlocked = useMutation({
    mutationFn: async (id: number) => { await supabase.from("professional_blocked_dates").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-blocked", user?.id] }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      if (status === "cancelled") {
        await cancelPaidProfessionalBooking({ data: { bookingId: id } });
        return;
      }

      const { error } = await supabase.from("bookings").update({ status })
        .eq("id", id).eq("professional_id", user!.id).select("id").single();
      if (error) throw new Error(error.message);
    },
    onError: (error: Error) => toast.error(error.message),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["pro-bookings", user?.id] });
      qc.invalidateQueries({ queryKey: ["my-offers", user?.id] });
      qc.invalidateQueries({ queryKey: ["pro-wallet", user?.id] });
      if (vars.status === "cancelled") {
        toast.warning("Serviço cancelado e devolvido à fila.");
      }
      if (vars.status === "awaiting_client_confirmation") {
        toast.success("Serviço marcado como concluído. Aguardando confirmação do cliente para liberar o pagamento.");
      }
    },
  });

  const suspensionDays = useQuery({
    queryKey: ["suspension-days"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("setting_value").eq("setting_key", "suspension_days_on_cancel").maybeSingle();
      return Number(data?.setting_value ?? 2);
    },
  });

  const rows = bookings.data ?? [];
  const upcoming = rows.filter((r) => r.status !== "completed" && r.status !== "cancelled");
  const past = rows.filter((r) => r.status === "completed" || r.status === "cancelled");

  return (
    <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
      <section className="lg:col-span-2 space-y-4 sm:space-y-6">
        <div className="rounded-xl border bg-card p-4 sm:p-5">
          <h2 className="font-semibold mb-3">Próximos serviços ({upcoming.length})</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum serviço confirmado ainda.</p>
          ) : (
            <ul className="divide-y">
              {upcoming.map((b) => {
                const isPaid = b.payment_status === "paid";
                const canCancel = isPaid && (b.status === "confirmed" || b.status === "in_progress");
                return (
                  <li key={b.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm sm:text-base">{b.service_type ?? "Serviço"} · {b.booking_date ? new Date(b.booking_date).toLocaleDateString("pt-BR") : "—"} {b.start_time ? `às ${b.start_time}` : ""}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground break-words">{b.address ?? ""} {b.city ? `— ${b.city}` : ""}</div>
                      {isPaid ? (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {BOOKING_STATUS[b.status] ?? b.status}
                          {b.total_price ? <> · <span className="font-semibold text-emerald-600">Você recebe R$ {computePayout(b.total_price, pct).toFixed(2)}</span></> : null}
                        </div>
                      ) : (
                        <div className="mt-3 flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-amber-400/70 bg-amber-100 px-3 py-2.5 text-sm font-bold text-amber-950 dark:border-amber-500/60 dark:bg-amber-950 dark:text-amber-100">
                          <Clock3 className="size-5 shrink-0" aria-hidden="true" />
                          <span>Aguardando pagamento do cliente</span>
                        </div>
                      )}
                    </div>
                    {canCancel && (
                      <div className="flex flex-col gap-2 shrink-0">
                        {isPaid && b.status === "confirmed" && (
                          <Button size="sm" variant="outline" className="flex-1 sm:flex-none min-h-10" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: b.id, status: "in_progress" })}>Iniciar</Button>
                        )}
                        {isPaid && b.status === "in_progress" && (
                          <Button
                            size="sm"
                            disabled={updateStatus.isPending}
                            className="flex-1 sm:flex-none min-h-10"
                            onClick={() => {
                              if (confirm("Marcar como concluído? O cliente precisará confirmar antes do pagamento ser liberado.")) {
                                updateStatus.mutate({ id: b.id, status: "awaiting_client_confirmation" });
                              }
                            }}
                          >
                            Concluir
                          </Button>
                        )}
                          <Button
                            disabled={updateStatus.isPending}
                            size="sm"
                            variant="ghost"
                            className="flex-1 sm:flex-none min-h-10 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              const d = suspensionDays.data ?? 2;
                              if (confirm(`Cancelar este serviço? Você ficará suspensa por ${d} dia(s) sem receber novas propostas.`)) {
                                updateStatus.mutate({ id: b.id, status: "cancelled" });
                              }
                            }}
                          >
                            Cancelar
                          </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {past.length > 0 && (
          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 className="font-semibold mb-3">Histórico</h2>
            <ul className="divide-y text-sm">
              {past.slice(0, 20).map((b) => (
                <li key={b.id} className="py-2 flex justify-between">
                  <span>{b.booking_date ? new Date(b.booking_date).toLocaleDateString("pt-BR") : "—"} · {b.service_type}</span>
                  <span className="text-muted-foreground">{b.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <aside className="space-y-4 sm:space-y-6">
        <div className="rounded-xl border bg-card p-4 sm:p-5">
          <h2 className="mb-1 font-semibold">Dias que atendo</h2>
          <p className="mb-3 text-sm text-muted-foreground">Escolha o período disponível em cada dia. Com os dois turnos, o almoço fica livre das 12h às 13h.</p>
          {avail.isError && <p role="alert" className="mb-3 text-sm text-destructive">Não foi possível carregar os horários.</p>}
          <div className="divide-y divide-border">
            {DAYS.map((day, index) => {
              const row = availabilityByDay.get(index);
              const start = row?.start_time.slice(0, 5);
              const end = row?.end_time.slice(0, 5);
              const saved = row?.is_available
                ? PERIODS.find((period) => period.value !== "off" && period.start === start && period.end === end)?.value ?? (start === "08:00" && end === "18:00" ? "all" : start === "12:00" && end === "18:00" ? "afternoon" : "custom")
                : "off";
              const value = savePeriod.isPending && savePeriod.variables.day === index ? savePeriod.variables.period.value : saved;

              return (
                <div key={day} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5">
                  <label htmlFor={`availability-day-${index}`} className="text-sm font-medium">{day}</label>
                  <select
                    id={`availability-day-${index}`}
                    className="min-h-11 max-w-full flex-1 rounded-lg border border-input bg-background px-2 py-1 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
                    value={value}
                    disabled={avail.isLoading || avail.isError || savePeriod.isPending}
                    onChange={(event) => {
                      const period = PERIODS.find((option) => option.value === event.target.value);
                      if (period) savePeriod.mutate({ day: index, period });
                    }}
                  >
                    {saved === "custom" && <option value="custom" disabled>{start} às {end}</option>}
                    {PERIODS.map((period) => <option key={period.value} value={period.value}>{period.label}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 sm:p-5">
          <h2 className="font-semibold mb-3">Bloquear datas</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} />
            <Button onClick={() => addBlocked.mutate()} disabled={!blockDate || addBlocked.isPending} className="min-h-11">Bloquear</Button>
          </div>
          <Input className="mt-2" placeholder="Motivo (opcional)" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
          <ul className="mt-3 space-y-1 text-sm">
            {(blocked.data ?? []).map((b) => (
              <li key={b.id} className="flex items-center justify-between py-1">
                <span>{new Date(b.blocked_date).toLocaleDateString("pt-BR")}{b.reason ? ` · ${b.reason}` : ""}</span>
                <button onClick={() => rmBlocked.mutate(b.id)} className="text-xs text-destructive">remover</button>
              </li>
            ))}
            {(blocked.data ?? []).length === 0 && <li className="text-xs text-muted-foreground">Nenhuma data bloqueada.</li>}
          </ul>
        </div>
      </aside>
    </div>
  );
}
