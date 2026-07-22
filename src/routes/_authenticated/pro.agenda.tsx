import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useCommissionPct, computePayout } from "@/hooks/use-commission";

export const Route = createFileRoute("/_authenticated/pro/agenda")({
  component: AgendaPage,
});

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function AgendaPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const pct = useCommissionPct();

  const bookings = useQuery({
    queryKey: ["pro-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("bookings")
        .select("id,service_type,booking_date,start_time,duration_hours,address,city,status,total_price,client_email")
        .eq("professional_id", user!.id)
        .order("booking_date", { ascending: true });
      return data ?? [];
    },
  });

  const avail = useQuery({
    queryKey: ["my-avail", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("professional_availability").select("*").eq("professional_id", user!.id)).data ?? [],
  });

  const blocked = useQuery({
    queryKey: ["my-blocked", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("professional_blocked_dates").select("*").eq("professional_id", user!.id).order("blocked_date")).data ?? [],
  });

  const enabledDays = new Set((avail.data ?? []).filter((a) => a.is_available).map((a) => a.day_of_week));

  const toggleDay = useMutation({
    mutationFn: async (day: number) => {
      if (!user) return;
      const existing = (avail.data ?? []).find((a) => a.day_of_week === day);
      if (existing) {
        await supabase.from("professional_availability").delete().eq("id", existing.id);
      } else {
        await supabase.from("professional_availability").insert({ professional_id: user.id, day_of_week: day, start_time: "08:00", end_time: "18:00", is_available: true });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-avail", user?.id] }),
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
      await supabase.from("bookings").update({ status }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pro-bookings", user?.id] }),
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
              {upcoming.map((b) => (
                <li key={b.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm sm:text-base">{b.service_type ?? "Serviço"} · {b.booking_date ? new Date(b.booking_date).toLocaleDateString("pt-BR") : "—"} {b.start_time ? `às ${b.start_time}` : ""}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground break-words">{b.address ?? ""} {b.city ? `— ${b.city}` : ""}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Status: {b.status}
                      {b.total_price ? <> · <span className="text-emerald-600 font-semibold">Você recebe R$ {computePayout(b.total_price, pct).toFixed(2)}</span></> : null}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {b.status !== "in_progress" && <Button size="sm" variant="outline" className="flex-1 sm:flex-none min-h-10" onClick={() => updateStatus.mutate({ id: b.id, status: "in_progress" })}>Iniciar</Button>}
                    <Button size="sm" className="flex-1 sm:flex-none min-h-10" onClick={() => updateStatus.mutate({ id: b.id, status: "completed" })}>Concluir</Button>
                  </div>
                </li>
              ))}
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
          <h2 className="font-semibold mb-3">Dias que atendo</h2>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((d, i) => (
              <button key={d} onClick={() => toggleDay.mutate(i)}
                className={`h-11 rounded-md text-xs font-semibold ${enabledDays.has(i) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {d}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">08:00 – 18:00. Clique para ativar/desativar.</p>
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