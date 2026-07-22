import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Home, Clock, CheckCircle2, ArrowLeft, Star, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  pro: fallback(z.string(), "").default(""),
  city: fallback(z.string(), "").default(""),
  dur: fallback(z.number(), 4).default(4),
  type: fallback(z.string(), "residential").default("residential"),
  rooms: fallback(z.number(), 2).default(2),
  baths: fallback(z.number(), 1).default(1),
});

export const Route = createFileRoute("/agendamento")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Agendamento — Gersepa Solutions" },
      { name: "description", content: "Finalize seu agendamento em poucos passos: escolha data, confirme e pague com PIX." },
      { property: "og:title", content: "Agendamento — Gersepa Solutions" },
      { property: "og:description", content: "Diaristas verificadas e agendamento 100% online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendamentoPage,
});

const PROPERTY_LABEL: Record<string, string> = {
  residential: "Casa",
  casa: "Casa",
  apartamento: "Apartamento",
  comercial: "Comercial",
};

const DAYS_SHORT = ["Dom.", "Seg.", "Ter.", "Qua.", "Qui.", "Sex.", "Sáb."];
const MONTHS_SHORT = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

function AgendamentoPage() {
  const s = Route.useSearch();
  const { user } = useAuth();
  const nav = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(2);
  const [pkgId, setPkgId] = useState<number | null>(null);
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [address, setAddress] = useState("");
  const [complement, setComplement] = useState("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pro = useQuery({
    enabled: !!s.pro,
    queryKey: ["ag-pro", s.pro],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles")
        .select("id, full_name, profile_photo, city, city_slug, rating, total_reviews, bio")
        .eq("id", s.pro).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const packages = useQuery({
    queryKey: ["ag-pkgs"],
    queryFn: async () => (await supabase.from("pricing_packages")
      .select("id, duration_hours, price, start_time, is_enabled")
      .eq("is_enabled", true).order("duration_hours")).data ?? [],
  });

  const blocked = useQuery({
    enabled: !!s.pro,
    queryKey: ["ag-blocked", s.pro],
    queryFn: async () => (await supabase.from("professional_blocked_dates")
      .select("blocked_date").eq("professional_id", s.pro)).data ?? [],
  });

  const availability = useQuery({
    enabled: !!s.pro,
    queryKey: ["ag-availability", s.pro],
    queryFn: async () => {
      const { data, error } = await supabase.from("professional_availability")
        .select("day_of_week, start_time, end_time, is_available")
        .eq("professional_id", s.pro);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Pre-select package matching dur
  const selectedPkg = useMemo(() => {
    const list = packages.data ?? [];
    if (pkgId) return list.find(p => p.id === pkgId) ?? null;
    return list.find(p => Number(p.duration_hours) === Number(s.dur)) ?? list[0] ?? null;
  }, [packages.data, pkgId, s.dur]);

  const days = useMemo(() => {
    const today = new Date();
    const arr: { iso: string; label: string; weekday: string; blocked: boolean; reason?: string; range?: string }[] = [];
    const set = new Set((blocked.data ?? []).map(b => b.blocked_date));
    const availabilityByDay = new Map((availability.data ?? []).map((a) => [a.day_of_week, a]));
    const hasAvailability = (availability.data ?? []).length > 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const dayAvailability = availabilityByDay.get(d.getDay());
      const blockedByDate = set.has(iso);
      const blockedBySchedule = hasAvailability && (!dayAvailability || !dayAvailability.is_available);
      arr.push({
        iso,
        label: `${String(d.getDate()).padStart(2, "0")} ${MONTHS_SHORT[d.getMonth()]}`,
        weekday: DAYS_SHORT[d.getDay()],
        blocked: blockedByDate || blockedBySchedule,
        reason: blockedByDate ? "Bloqueada" : blockedBySchedule ? "Indisponível" : undefined,
        range: dayAvailability?.is_available ? `${dayAvailability.start_time.slice(0, 5)}–${dayAvailability.end_time.slice(0, 5)}` : undefined,
      });
    }
    return arr;
  }, [availability.data, blocked.data]);

  const selectedDay = days.find((d) => d.iso === date);
  const selectedAvailability = useMemo(() => {
    if (!date) return null;
    const weekday = new Date(`${date}T00:00:00`).getDay();
    return (availability.data ?? []).find((a) => a.day_of_week === weekday) ?? null;
  }, [availability.data, date]);

  const times = useMemo(() => {
    const duration = Number(selectedPkg?.duration_hours ?? s.dur ?? 1);
    if (!selectedAvailability?.is_available) {
      return Array.from({ length: 15 }, (_, i) => `${String(6 + i).padStart(2, "0")}:00`);
    }
    const start = timeToMinutes(selectedAvailability.start_time);
    const end = timeToMinutes(selectedAvailability.end_time) - duration * 60;
    const slots: string[] = [];
    for (let current = start; current <= end; current += 60) slots.push(minutesToTime(current));
    return slots.length ? slots : [selectedAvailability.start_time.slice(0, 5)];
  }, [s.dur, selectedAvailability, selectedPkg?.duration_hours]);

  const canNextFromStep2 = !!(selectedPkg && date && time && !selectedDay?.blocked && times.includes(time));
  const canNextFromStep3 = !!(address.trim().length >= 3 && (user || email.trim()));

  async function submitBooking() {
    if (!selectedPkg || !date || !time || !s.pro) return;
    setSubmitting(true);
    try {
      const cityName = pro.data?.city ?? s.city;
      const { data: booking, error } = await supabase.from("bookings").insert({
        client_id: user?.id ?? null,
        client_email: user?.email ?? email ?? null,
        professional_id: s.pro,
        booking_type: "direct",
        service_type: "diarista",
        property_type: s.type,
        booking_date: date,
        start_time: time,
        duration_hours: selectedPkg.duration_hours,
        rooms: s.rooms,
        bathrooms: s.baths,
        address: address,
        address_complement: complement || null,
        city: cityName,
        city_slug: pro.data?.city_slug ?? s.city ?? null,
        notes: notes || null,
        status: "pending",
        total_price: selectedPkg.price,
        payment_method: "pix",
        payment_status: "pending",
        payment_amount: selectedPkg.price,
      }).select("id").single();
      if (error) throw error;
      toast.success("Agendamento criado! Você receberá o código PIX em instantes.");
      nav({ to: user ? "/bookings/$bookingId" : "/", params: { bookingId: String(booking.id) } });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar agendamento");
    } finally {
      setSubmitting(false);
    }
  }

  const p = pro.data;

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link to="/professionals" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        {/* Summary */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-lg mb-4">Resumo do Agendamento</h2>
          <div className="grid sm:grid-cols-4 gap-4">
            <SummaryItem icon={<MapPin className="h-4 w-4" />} tint="bg-emerald-50 text-emerald-600" label="Cidade" value={p?.city ?? s.city ?? "—"} />
            <SummaryItem icon={<Home className="h-4 w-4" />} tint="bg-sky-50 text-sky-600" label="Imóvel" value={PROPERTY_LABEL[s.type] ?? s.type} />
            <SummaryItem icon={<Home className="h-4 w-4" />} tint="bg-emerald-50 text-emerald-600" label="Cômodos" value={`${s.rooms} qts, ${s.baths} bh`} />
            <SummaryItem icon={<Clock className="h-4 w-4" />} tint="bg-amber-50 text-amber-600" label="Duração" value={`${selectedPkg?.duration_hours ?? s.dur}h`} />
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-8 text-sm">
          {[
            { n: 1, label: "Profissional" },
            { n: 2, label: "Data/Horário" },
            { n: 3, label: "Confirmar" },
            { n: 4, label: "Pagamento" },
          ].map((it, idx, arr) => (
            <div key={it.n} className="flex items-center flex-1 last:flex-none">
              <div className={`flex items-center gap-2 ${step >= it.n ? "text-primary" : "text-muted-foreground"}`}>
                <div className={`h-7 w-7 rounded-full grid place-items-center text-xs font-bold ${step > it.n ? "bg-primary text-primary-foreground" : step === it.n ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {step > it.n ? <CheckCircle2 className="h-4 w-4" /> : it.n}
                </div>
                <span className="font-medium hidden sm:inline">{it.label}</span>
              </div>
              {idx < arr.length - 1 && <div className={`flex-1 h-px mx-3 ${step > it.n ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Escolha a Data e Horário</h1>
              <p className="text-muted-foreground text-sm">Selecione quando {p?.full_name?.split(" ")[0] ?? "a diarista"} deve realizar a limpeza.</p>
            </div>

            {p && (
              <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                {p.profile_photo ? (
                  <img src={p.profile_photo} alt={p.full_name ?? ""} className="h-14 w-14 rounded-xl object-cover border" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-primary/10 text-primary grid place-items-center font-bold">{(p.full_name ?? "?")[0]}</div>
                )}
                <div>
                  <div className="font-semibold">{p.full_name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {Number(p.rating ?? 0).toFixed(1)} · {p.total_reviews ?? 0}+ limpezas
                  </div>
                </div>
              </div>
            )}

            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> Escolha o Pacote de Serviço
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(packages.data ?? []).map(pk => {
                  const active = selectedPkg?.id === pk.id;
                  return (
                    <button key={pk.id} type="button" onClick={() => setPkgId(pk.id)}
                      className={`text-left rounded-xl border p-3 transition ${active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:border-primary/40"}`}>
                      <div className="font-bold">{pk.duration_hours} horas</div>
                      <div className="text-xs text-muted-foreground">{pk.start_time?.slice(0,5)} - {sumHours(pk.start_time, pk.duration_hours)}</div>
                      <div className="mt-2 font-bold text-amber-600">R$ {Number(pk.price).toFixed(2)}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-sm">Selecione a Data</Label>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-7 gap-2">
                {days.map(d => {
                  const active = date === d.iso;
                  return (
                    <button key={d.iso} type="button" disabled={d.blocked} onClick={() => setDate(d.iso)}
                      className={`rounded-xl border p-3 text-center transition ${d.blocked ? "opacity-50 cursor-not-allowed" : active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:border-primary/40"}`}>
                      <div className="text-xs text-muted-foreground">{d.weekday}</div>
                      <div className="font-semibold">{d.label}</div>
                      {d.blocked && <div className="text-[10px] text-destructive">Indisponível</div>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-sm">Selecione o Horário</Label>
              <div className="mt-2 grid grid-cols-4 sm:grid-cols-8 gap-2">
                {times.map(t => {
                  const active = time === t;
                  return (
                    <button key={t} type="button" onClick={() => setTime(t)}
                      className={`rounded-xl border py-2 text-center font-semibold transition ${active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:border-primary/40"}`}>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="lg" disabled={!canNextFromStep2} onClick={() => setStep(3)}>Continuar</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Confirmar Endereço</h1>
              <p className="text-muted-foreground text-sm">Onde a diarista deve atender?</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div>
                <Label>Endereço completo</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} placeholder="Rua, número, bairro" />
              </div>
              <div>
                <Label>Complemento (opcional)</Label>
                <Input value={complement} onChange={(e) => setComplement(e.target.value)} maxLength={100} placeholder="Apto, bloco, referência" />
              </div>
              <div>
                <Label>Observações (opcional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500} placeholder="Detalhes que a diarista deve saber" />
              </div>
              {!user && (
                <div>
                  <Label>Seu e-mail para contato</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required />
                </div>
              )}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
              <Button size="lg" disabled={!canNextFromStep3} onClick={() => setStep(4)}>Continuar</Button>
            </div>
          </div>
        )}

        {step === 4 && selectedPkg && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Pagamento</h1>
              <p className="text-muted-foreground text-sm">Revise e confirme para gerar o PIX.</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
              <Row label="Profissional" value={p?.full_name ?? "—"} />
              <Row label="Data" value={formatDate(date)} />
              <Row label="Início" value={time} />
              <Row label="Duração" value={`${selectedPkg.duration_hours}h`} />
              <Row label="Endereço" value={address} />
              <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">R$ {Number(selectedPkg.price).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>Voltar</Button>
              <Button size="lg" disabled={submitting} onClick={submitBooking}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {submitting ? "Enviando…" : "Confirmar e gerar PIX"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryItem({ icon, tint, label, value }: { icon: React.ReactNode; tint: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl grid place-items-center ${tint}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}

function sumHours(start: string | null | undefined, dur: number): string {
  if (!start) return "";
  const [h, m] = start.split(":").map(Number);
  const end = new Date(2000, 0, 1, h, m);
  end.setHours(end.getHours() + Number(dur));
  return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return `${DAYS_SHORT[d.getDay()]} ${String(d.getDate()).padStart(2, "0")} ${MONTHS_SHORT[d.getMonth()]}`;
}