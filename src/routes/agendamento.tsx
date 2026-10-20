import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { useServerFn } from "@tanstack/react-start";
import { createPayment } from "@/lib/mercadopago.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Home, Clock, CheckCircle2, ArrowLeft, Star, Calendar as CalendarIcon, QrCode, CreditCard as CreditCardIcon, BedDouble, Lock } from "lucide-react";
import { toast } from "sonner";
import { MpSecureCardFields, type MpSecureCardFieldsHandle } from "@/components/MpSecureCardFields";

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
  const runCreatePayment = useServerFn(createPayment);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(2);
  const [pkgId, setPkgId] = useState<number | null>(null);
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [address, setAddress] = useState("");
  const [complement, setComplement] = useState("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Método selecionado no passo 4
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [cardHolder, setCardHolder] = useState("");
  const [cardCpf, setCardCpf] = useState("");
  const [installments, setInstallments] = useState(1);
  const mpFieldsRef = useRef<MpSecureCardFieldsHandle | null>(null);

  // Configurações públicas do gateway
  const paySettings = useQuery({
    queryKey: ["public-pay-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["payment_platform", "pix_enabled", "card_enabled", "mp_public_key"]);
      const m: Record<string, string> = {};
      for (const r of data ?? []) m[r.setting_key] = r.setting_value ?? "";
      return {
        platform: (m.payment_platform || "mercadopago").toLowerCase(),
        pixEnabled: m.pix_enabled !== "0",
        cardEnabled: m.card_enabled !== "0",
        mpPublicKey: m.mp_public_key || "",
      };
    },
  });

  const platform = paySettings.data?.platform ?? "mercadopago";
  const pixEnabled = paySettings.data?.pixEnabled ?? true;
  const cardEnabled = (paySettings.data?.cardEnabled ?? true) && platform === "mercadopago";

  useEffect(() => {
    if (paymentMethod === "pix" && !pixEnabled && cardEnabled) setPaymentMethod("card");
    if (paymentMethod === "card" && !cardEnabled && pixEnabled) setPaymentMethod("pix");
  }, [pixEnabled, cardEnabled]);

  const meProfile = useQuery({
    enabled: !!user?.id,
    queryKey: ["ag-me", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("full_name, phone, cpf, address, address_number, address_complement, address_neighborhood, city")
        .eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    const p = meProfile.data;
    if (!p) return;
    if (!address) {
      const street = [p.address, p.address_number].filter(Boolean).join(", ");
      const parts = [street, p.address_neighborhood, p.city].filter(Boolean);
      if (parts.length) setAddress(parts.join(" - "));
    }
    if (!complement && p.address_complement) setComplement(p.address_complement);
    if (!guestName && p.full_name) setGuestName(p.full_name);
    if (!guestPhone && p.phone) setGuestPhone(p.phone);
    if (!email && user?.email) setEmail(user.email);
    if (!cardCpf && (p as any).cpf) setCardCpf(String((p as any).cpf));
  }, [meProfile.data, user?.email]);

  const pro = useQuery({
    enabled: !!s.pro,
    queryKey: ["ag-pro", s.pro],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_professional", { _id: s.pro! });
      if (error) throw error;
      return data?.[0] ?? null;
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
    queryFn: async () => (await supabase.rpc("get_professional_blocked_dates", { _pro: s.pro! })).data ?? [],
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
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
    let slots: string[];
    if (!selectedAvailability?.is_available) {
      slots = Array.from({ length: 15 }, (_, i) => `${String(6 + i).padStart(2, "0")}:00`);
    } else {
      const start = timeToMinutes(selectedAvailability.start_time);
      const end = timeToMinutes(selectedAvailability.end_time) - duration * 60;
      slots = [];
      for (let current = start; current <= end; current += 60) slots.push(minutesToTime(current));
      if (!slots.length) slots = [selectedAvailability.start_time.slice(0, 5)];
    }
    // Se a data escolhida é hoje (fuso America/Sao_Paulo), esconde horários
    // já passados e exige pelo menos 1h de antecedência.
    try {
      const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false,
      });
      const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
      const todayISO = `${parts.year}-${parts.month}-${parts.day}`;
      if (date === todayISO) {
        const nowMin = Number(parts.hour) * 60 + Number(parts.minute) + 60; // buffer 1h
        slots = slots.filter(t => timeToMinutes(t) >= nowMin);
      }
    } catch { /* noop */ }
    return slots;
  }, [s.dur, selectedAvailability, selectedPkg?.duration_hours, date]);

  useEffect(() => {
    if (date && selectedDay?.blocked) {
      setDate("");
      setTime("");
      return;
    }
    if (!date && !blocked.isLoading && !availability.isLoading) {
      const firstAvailableDay = days.find((d) => !d.blocked);
      if (firstAvailableDay) setDate(firstAvailableDay.iso);
    }
  }, [availability.isLoading, blocked.isLoading, date, days, selectedDay?.blocked]);

  useEffect(() => {
    if (time && !times.includes(time)) setTime("");
  }, [time, times]);

  const canNextFromStep2 = !!(selectedPkg && date && time && !selectedDay?.blocked && times.includes(time));
  const canNextFromStep3 = !!(
    address.trim().length >= 3 &&
    (user || (email.trim() && guestName.trim().length >= 2 && guestPhone.trim().length >= 8))
  );

  async function submitBooking() {
    if (!selectedPkg || !date || !time || !s.pro) return;
    setSubmitting(true);
    try {
      const cityName = pro.data?.city ?? s.city;
      const clientEmail = user?.email ?? email;
      if (!clientEmail) throw new Error("Informe seu e-mail para receber o pagamento.");

      // Se cartão: tokeniza no navegador via SDK do Mercado Pago (o número do cartão nunca vai ao nosso servidor)
      let cardToken: string | null = null;
      let cardPaymentMethodId: string | null = null;
      if (paymentMethod === "card") {
        if (platform !== "mercadopago") throw new Error("Cartão disponível apenas via Mercado Pago no momento.");
        const publicKey = paySettings.data?.mpPublicKey;
        if (!publicKey) throw new Error("Cartão indisponível: peça ao administrador para preencher a Public Key do Mercado Pago.");
        const cpfDigits = cardCpf.replace(/\D/g, "");
        if (!cardHolder.trim() || cpfDigits.length !== 11) {
          throw new Error("Preencha o nome do titular e o CPF corretamente.");
        }
        if (!mpFieldsRef.current?.ready) {
          throw new Error("Formulário do cartão ainda carregando. Aguarde alguns segundos.");
        }
        const tok = await mpFieldsRef.current.tokenize({
          cardholderName: cardHolder.trim(),
          identificationType: "CPF",
          identificationNumber: cpfDigits,
        });
        cardToken = tok.token;
        cardPaymentMethodId = tok.paymentMethodId;
      }

      const result = await runCreatePayment({
        data: {
          professional_id: s.pro,
          package_id: selectedPkg.id,
          booking_date: date,
          start_time: time,
          property_type: s.type,
          rooms: s.rooms,
          bathrooms: s.baths,
          address,
          address_complement: complement || null,
          city: cityName || null,
          city_slug: pro.data?.city_slug ?? s.city ?? null,
          notes: notes || null,
          client_name: user?.user_metadata?.full_name ?? guestName ?? null,
          client_email: clientEmail,
          client_phone: user ? (user.user_metadata?.phone ?? null) : (guestPhone || null),
          payment_method: paymentMethod,
          card_token: cardToken,
          card_installments: installments,
          card_payment_method_id: cardPaymentMethodId,
          card_issuer_id: null,
          payer_document: cardCpf ? cardCpf.replace(/\D/g, "") : null,
          device_id: (typeof window !== "undefined" ? (window as unknown as { MP_DEVICE_SESSION_ID?: string }).MP_DEVICE_SESSION_ID : null) ?? null,
        },
      });
      if (paymentMethod === "card" && result.status === "approved") {
        toast.success("Pagamento aprovado! Agendamento confirmado.");
      } else if (paymentMethod === "card" && result.status === "rejected") {
        toast.error("Pagamento recusado. Verifique os dados do cartão ou tente outro.");
        return;
      } else if (paymentMethod === "card") {
        toast.info(`Pagamento em análise (${result.status}). Você será notificado.`);
      } else {
        toast.success("Cobrança PIX gerada! Efetue o pagamento para confirmar.");
      }
      nav({
        to: "/agendamento-sucesso/$id",
        params: { id: String(result.bookingId) },
        search: { t: result.guestToken },
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar pagamento");
    } finally {
      setSubmitting(false);
    }
  }

  const p = pro.data;
  const stepsDef = [
    { n: 1, label: "Profissional" },
    { n: 2, label: "Data/Horário" },
    { n: 3, label: "Confirmar" },
    { n: 4, label: "Pagamento" },
  ];
  const price = selectedPkg ? Number(selectedPkg.price) : null;
  const showSummary = step !== 4;
  const TINT_TEAL = "bg-[var(--bc-mist)] text-[var(--bc-teal)]";
  const TINT_WARM = "bg-orange-50 text-[var(--bc-orange)]";
  const baseRows = [
    { key: "city", icon: <MapPin className="h-4 w-4" />, tint: TINT_TEAL, label: "Cidade", value: p?.city ?? s.city ?? "—" },
    { key: "type", icon: <Home className="h-4 w-4" />, tint: TINT_TEAL, label: "Imóvel", value: PROPERTY_LABEL[s.type] ?? s.type },
    { key: "rooms", icon: <BedDouble className="h-4 w-4" />, tint: TINT_TEAL, label: "Cômodos", value: `${s.rooms} qts, ${s.baths} bh` },
    { key: "dur", icon: <Clock className="h-4 w-4" />, tint: TINT_WARM, label: "Duração", value: `${selectedPkg?.duration_hours ?? s.dur}h` },
  ];
  const selectedBtn = "border-primary bg-primary text-primary-foreground shadow-[0_8px_20px_-8px_rgb(15_107_107/0.55)]";
  const idleBtn = "border-border bg-white hover:border-primary/50 hover:bg-[var(--bc-mist)]";
  const hideScrollbar = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

  return (
    <div className="min-h-screen bg-[var(--bc-paper)]">
      <Header />
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-6 sm:py-10">
        <Link to="/professionals" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        {/* Stepper */}
        <nav aria-label="Etapas do agendamento" className="mb-6 sm:mb-8">
          <ol className="flex items-center">
            {stepsDef.map((it, idx, arr) => {
              const done = step > it.n;
              const current = step === it.n;
              return (
                <li key={it.n} aria-current={current ? "step" : undefined} className={`flex items-center ${idx < arr.length - 1 ? "flex-1" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition ${
                        done || current ? "bg-primary text-primary-foreground" : "bg-white text-muted-foreground ring-1 ring-border"
                      } ${current ? "ring-4 ring-primary/20" : ""}`}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : it.n}
                    </span>
                    <span className={`hidden text-sm font-semibold sm:inline ${done || current ? "text-[var(--bc-navy)]" : "text-muted-foreground"}`}>
                      {it.label}
                    </span>
                  </div>
                  {idx < arr.length - 1 && <span aria-hidden className={`mx-3 h-0.5 flex-1 rounded-full ${done ? "bg-primary" : "bg-border"}`} />}
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-sm font-semibold text-[var(--bc-navy)] sm:hidden">
            Passo {step} de 4 · {stepsDef[step - 1].label}
          </p>
        </nav>

        <div className={showSummary ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8" : "mx-auto max-w-2xl"}>
          <div className="min-w-0 space-y-6">
            {/* Resumo compacto (celular) */}
            {showSummary && (
              <div className={`${CARD} p-4 lg:hidden`}>
                <h2 className="mb-3 font-display text-sm font-bold text-[var(--bc-navy)]">Resumo do Agendamento</h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {baseRows.map((r) => (
                    <SummaryItem key={r.key} small icon={r.icon} tint={r.tint} label={r.label} value={r.value} />
                  ))}
                </div>
                {price !== null && (
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-sm font-semibold text-[var(--bc-navy-2)]">Total</span>
                    <span className="font-display text-lg font-extrabold text-primary">{brl(price)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Step content */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-2xl font-extrabold tracking-tight text-[var(--bc-navy)] sm:text-3xl">Escolha a Data e Horário</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Selecione quando {p?.full_name?.split(" ")[0] ?? "a diarista"} deve realizar a limpeza.</p>
                </div>

                {p && (
                  <div className={`${CARD} flex items-center gap-4 p-4`}>
                    {p.profile_photo ? (
                      <img src={p.profile_photo} alt={p.full_name ?? ""} className="h-14 w-14 rounded-2xl object-cover" />
                    ) : (
                      <div className="grid h-14 w-14 place-items-center rounded-2xl font-display text-xl font-extrabold text-white" style={{ background: "var(--gradient-brand)" }}>
                        {(p.full_name ?? "?")[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-display font-bold text-[var(--bc-navy)]">{p.full_name}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-[var(--bc-navy)]">{Number(p.rating ?? 0).toFixed(1)}</span> · {p.total_reviews ?? 0}+ limpezas
                      </div>
                    </div>
                  </div>
                )}

                <div className={`${CARD} p-5`}>
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--bc-navy)]">
                    <Clock className="h-4 w-4 text-primary" /> Escolha o Pacote de Serviço
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3">
                    {(packages.data ?? []).map(pk => {
                      const active = selectedPkg?.id === pk.id;
                      return (
                        <button key={pk.id} type="button" onClick={() => setPkgId(pk.id)} aria-pressed={active}
                          className={`relative rounded-2xl border p-3 text-left transition ${active ? "border-primary bg-[var(--bc-mist)] shadow-[inset_0_0_0_1px_var(--bc-teal)]" : idleBtn}`}>
                          {active && <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-primary" />}
                          <div className="font-display text-base font-bold text-[var(--bc-navy)] sm:text-lg">{pk.duration_hours}h</div>
                          <div className="whitespace-nowrap text-[11px] text-muted-foreground">{pk.start_time?.slice(0,5)}–{sumHours(pk.start_time, pk.duration_hours)}</div>
                          <div className="mt-2 text-sm font-extrabold text-[var(--bc-orange)]">{brl(Number(pk.price))}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={`${CARD} p-5`}>
                  <Label className="text-sm font-semibold text-[var(--bc-navy)]">Selecione a Data</Label>
                  <div className={`-mx-5 mt-3 flex snap-x gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-7 sm:overflow-visible sm:px-0 sm:pb-0 ${hideScrollbar}`}>
                    {days.map(d => {
                      const active = date === d.iso;
                      return (
                        <button key={d.iso} type="button" disabled={d.blocked} aria-pressed={active} onClick={() => { setDate(d.iso); setTime(""); }}
                          className={`w-[90px] shrink-0 snap-start whitespace-nowrap rounded-2xl border px-2 py-3 text-center transition sm:w-auto ${
                            d.blocked ? "cursor-not-allowed border-border bg-muted/50 opacity-60" : active ? selectedBtn : idleBtn
                          }`}>
                          <div className={`text-xs ${active ? "text-white/80" : "text-muted-foreground"}`}>{d.weekday}</div>
                          <div className="font-display text-sm font-bold leading-tight sm:text-base">{d.label}</div>
                          {d.blocked ? <div className="text-[10px] text-destructive">{d.reason ?? "Indisponível"}</div> : d.range ? <div className={`text-[10px] ${active ? "text-white/80" : "text-muted-foreground"}`}>{d.range}</div> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={`${CARD} p-5`}>
                  <Label className="text-sm font-semibold text-[var(--bc-navy)]">Selecione o Horário de Início</Label>
                  {times.length === 0 && (
                    <p className="mt-3 text-sm text-muted-foreground">Escolha uma data para ver os horários disponíveis.</p>
                  )}
                  <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
                    {times.map(t => {
                      const active = time === t;
                      return (
                        <button key={t} type="button" onClick={() => setTime(t)} aria-pressed={active}
                          className={`rounded-xl border py-2.5 text-center text-sm font-bold transition ${active ? selectedBtn : idleBtn}`}>
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button size="lg" className="h-12 w-full rounded-xl px-8 font-bold sm:w-auto" disabled={!canNextFromStep2} onClick={() => setStep(3)}>Continuar</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-2xl font-extrabold tracking-tight text-[var(--bc-navy)] sm:text-3xl">Confirmar Endereço</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Onde a diarista deve atender?</p>
                </div>
                <div className={`${CARD} space-y-4 p-5 sm:p-6`}>
                  <div>
                    <Label>Endereço completo</Label>
                    <Input className="mt-1.5 h-12 rounded-xl bg-white" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} placeholder="Rua, número, bairro" />
                  </div>
                  <div>
                    <Label>Complemento (opcional)</Label>
                    <Input className="mt-1.5 h-12 rounded-xl bg-white" value={complement} onChange={(e) => setComplement(e.target.value)} maxLength={100} placeholder="Apto, bloco, referência" />
                  </div>
                  <div>
                    <Label>Observações (opcional)</Label>
                    <Textarea className="mt-1.5 rounded-xl bg-white" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500} placeholder="Detalhes que a diarista deve saber" />
                  </div>
                  {!user && (
                    <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
                      <div>
                        <Label>Seu nome</Label>
                        <Input className="mt-1.5 h-12 rounded-xl bg-white" value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={100} placeholder="Como devemos te chamar" required />
                      </div>
                      <div>
                        <Label>WhatsApp</Label>
                        <Input className="mt-1.5 h-12 rounded-xl bg-white" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} maxLength={20} placeholder="(47) 99999-9999" required />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Seu e-mail</Label>
                        <Input className="mt-1.5 h-12 rounded-xl bg-white" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} placeholder="voce@email.com" required />
                        <p className="mt-1.5 text-xs text-muted-foreground">Enviaremos a confirmação e o código PIX por e-mail.</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between gap-3">
                  <Button variant="outline" className="h-12 rounded-xl px-6" onClick={() => setStep(2)}>Voltar</Button>
                  <Button size="lg" className="h-12 flex-1 rounded-xl px-8 font-bold sm:flex-none" disabled={!canNextFromStep3} onClick={() => setStep(4)}>Continuar</Button>
                </div>
              </div>
            )}

            {step === 4 && selectedPkg && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-2xl font-extrabold tracking-tight text-[var(--bc-navy)] sm:text-3xl">Pagamento</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Revise, escolha a forma de pagamento e confirme.
                  </p>
                </div>
                <div className={`${CARD} overflow-hidden`}>
                  <div className="space-y-3 p-5 sm:p-6">
                    <Row label="Profissional" value={p?.full_name ?? "—"} />
                    <Row label="Data" value={formatDate(date)} />
                    <Row label="Início" value={time} />
                    <Row label="Duração" value={`${selectedPkg.duration_hours}h`} />
                    <Row label="Endereço" value={address} />
                  </div>
                  <div className="flex items-center justify-between bg-[var(--bc-navy)] px-5 py-4 text-white sm:px-6">
                    <span className="font-semibold">Total</span>
                    <span className="font-display text-2xl font-extrabold text-[var(--bc-teal-soft)]">{brl(Number(selectedPkg.price))}</span>
                  </div>
                </div>

                {/* Seletor de método */}
                <div className={`${CARD} p-4 sm:p-5`}>
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!pixEnabled}
                      aria-pressed={paymentMethod === "pix"}
                      onClick={() => setPaymentMethod("pix")}
                      className={`inline-flex h-14 items-center justify-center gap-2 rounded-2xl border text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        paymentMethod === "pix" ? selectedBtn : "border-border bg-white text-foreground hover:border-primary/50"
                      }`}
                    >
                      <QrCode className="h-4 w-4" /> PIX
                    </button>
                    <button
                      type="button"
                      disabled={!cardEnabled}
                      aria-pressed={paymentMethod === "card"}
                      onClick={() => setPaymentMethod("card")}
                      title={!cardEnabled && platform === "pagseguro" ? "Cartão via PagSeguro em breve" : undefined}
                      className={`inline-flex h-14 items-center justify-center gap-2 rounded-2xl border text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        paymentMethod === "card" ? selectedBtn : "border-border bg-white text-foreground hover:border-primary/50"
                      }`}
                    >
                      <CreditCardIcon className="h-4 w-4" /> Cartão
                    </button>
                  </div>

                  {paymentMethod === "pix" && (
                    <div className="rounded-2xl bg-[var(--bc-mist)] p-4 text-sm leading-relaxed text-[var(--bc-navy-2)]">
                      Após confirmar, geramos um QR Code PIX válido por 30 minutos. O agendamento é liberado assim que o pagamento é aprovado por <strong>{platform === "pagseguro" ? "PagSeguro" : "Mercado Pago"}</strong>.
                    </div>
                  )}

                  {paymentMethod === "card" && (
                    <div className="space-y-3">
                      <div>
                        <Label>Nome impresso no cartão</Label>
                        <Input
                          className="mt-1.5 h-12 rounded-xl bg-white"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                          maxLength={40}
                          placeholder="NOME COMO NO CARTÃO"
                        />
                      </div>
                      {paySettings.data?.mpPublicKey ? (
                        <MpSecureCardFields ref={mpFieldsRef} publicKey={paySettings.data.mpPublicKey} idPrefix="ag" />
                      ) : (
                        <p className="text-xs text-destructive">Cartão indisponível: Public Key do Mercado Pago não configurada.</p>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>CPF do titular</Label>
                          <Input
                            className="mt-1.5 h-12 rounded-xl bg-white"
                            value={cardCpf}
                            onChange={(e) => setCardCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
                            inputMode="numeric"
                            placeholder="Somente números"
                          />
                        </div>
                        <div>
                          <Label>Parcelas</Label>
                          <select
                            value={installments}
                            onChange={(e) => setInstallments(Number(e.target.value))}
                            className="mt-1.5 h-12 w-full rounded-xl border border-input bg-white px-3 text-sm"
                          >
                            {[1, 2, 3, 4, 5, 6].map((n) => (
                              <option key={n} value={n}>
                                {n}x de {brl(Number(selectedPkg.price) / n)}{n === 1 ? " (à vista)" : " sem juros"}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                        <Lock className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                        Campos hospedados pelo Mercado Pago (PCI-DSS SAQ-A). O número do cartão nunca passa pelo nosso servidor.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between gap-3">
                  <Button variant="outline" className="h-12 rounded-xl px-6" onClick={() => setStep(3)}>Voltar</Button>
                  <Button
                    size="lg"
                    disabled={submitting}
                    onClick={submitBooking}
                    className="h-12 flex-1 rounded-xl border-0 px-6 font-bold text-[#062f2f] shadow-[var(--shadow-glow-orange)] hover:brightness-105 sm:flex-none"
                    style={{ background: "var(--gradient-cta)" }}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {submitting ? "Enviando…" : "Confirmar pagamento"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Resumo lateral (computador) */}
          {showSummary && (
            <aside className="hidden lg:sticky lg:top-24 lg:block">
              <div className={`${CARD} p-6`}>
                <h2 className="font-display text-lg font-bold text-[var(--bc-navy)]">Resumo do Agendamento</h2>
                <div className="mt-5 space-y-4">
                  {p?.full_name && <SummaryItem icon={<Star className="h-4 w-4" />} tint={TINT_WARM} label="Profissional" value={p.full_name} />}
                  {baseRows.map((r) => (
                    <SummaryItem key={r.key} icon={r.icon} tint={r.tint} label={r.label} value={r.value} />
                  ))}
                </div>
                <div className="mt-5 space-y-2 border-t border-border pt-4">
                  <Row label="Data" value={formatDate(date)} />
                  <Row label="Início" value={time || "—"} />
                </div>
                {price !== null && (
                  <div className="mt-4 flex items-baseline justify-between rounded-2xl bg-[var(--bc-mist)] px-4 py-3">
                    <span className="text-sm font-semibold text-[var(--bc-navy-2)]">Total</span>
                    <span className="font-display text-2xl font-extrabold text-primary">{brl(price)}</span>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

const CARD = "rounded-3xl border border-[var(--bc-navy)]/8 bg-white shadow-[var(--shadow-card)]";

function brl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function SummaryItem({ icon, tint, label, value, small = false }: { icon: React.ReactNode; tint: string; label: string; value: string; small?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`grid shrink-0 place-items-center rounded-xl ${small ? "h-9 w-9" : "h-10 w-10"} ${tint}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`truncate font-semibold text-[var(--bc-navy)] ${small ? "text-sm" : ""}`}>{value}</div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-[var(--bc-navy)]">{value}</span>
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

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number): string {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return `${DAYS_SHORT[d.getDay()]} ${String(d.getDate()).padStart(2, "0")} ${MONTHS_SHORT[d.getMonth()]}`;
}
