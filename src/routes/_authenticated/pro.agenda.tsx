import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { BOOKING_SHIFTS } from "@/shared/lib/booking-shifts";

export const Route = createFileRoute("/_authenticated/pro/agenda")({
  component: AgendaPage,
});

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

  return (
    <div className="mx-auto grid max-w-5xl gap-4 sm:gap-6 lg:grid-cols-2">
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
    </div>
  );
}
