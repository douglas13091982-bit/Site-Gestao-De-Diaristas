import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import { MapPin, Home, Clock, CheckCircle2, ArrowLeft, Star, Calendar as CalendarIcon, QrCode, CreditCard as CreditCardIcon } from "lucide-react";
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
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState(""); // MM/AA
  const [cardCvv, setCardCvv] = useState("");
  const [cardCpf, setCardCpf] = useState("");
  const [installments, setInstallments] = useState(1);

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

  // Carrega SDK do Mercado Pago quando o usuário abre a aba Cartão
  useEffect(() => {
    if (step !== 4 || paymentMethod !== "card" || platform !== "mercadopago") return;
    if (typeof window === "undefined") return;
    if ((window as any).MercadoPago) return;
    const s = document.createElement("script");
    s.src = "https://sdk.mercadopago.com/js/v2";
    s.async = true;
    document.head.appendChild(s);
  }, [step, paymentMethod, platform]);

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
        const digits = cardNumber.replace(/\D/g, "");
        const [mmRaw, yyRaw] = cardExpiry.split("/");
        const mm = (mmRaw || "").padStart(2, "0");
        const yy = (yyRaw || "").slice(-2);
        const cpfDigits = cardCpf.replace(/\D/g, "");
        if (digits.length < 13 || !mm || !yy || cardCvv.length < 3 || !cardHolder.trim() || cpfDigits.length !== 11) {
          throw new Error("Preencha corretamente os dados do cartão e o CPF do titular.");
        }
        const MP = (window as any).MercadoPago;
        if (!MP) throw new Error("SDK do cartão ainda carregando. Aguarde alguns segundos e tente novamente.");
        const mp = new MP(publicKey);
        try {
          const bin = digits.slice(0, 8);
          const methodsRes = await mp.getPaymentMethods({ bin });
          cardPaymentMethodId = methodsRes?.results?.[0]?.id ?? null;
        } catch { cardPaymentMethodId = null; }
        const tokenRes = await mp.createCardToken({
          cardNumber: digits,
          cardholderName: cardHolder.trim(),
          cardExpirationMonth: mm,
          cardExpirationYear: yy,
          securityCode: cardCvv,
          identificationType: "CPF",
          identificationNumber: cpfDigits,
        });
        cardToken = tokenRes?.id ?? null;
        if (!cardToken) throw new Error("Não foi possível validar o cartão. Verifique os dados.");
      }

      const result = await runCreatePayment({
        data: {
          professional_id: s.pro,
          package_id: selectedPkg.id,
          duration_hours: Number(selectedPkg.duration_hours),
          total_price: Number(selectedPkg.price),
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
          client_id: user?.id ?? null,
          client_name: user?.user_metadata?.full_name ?? guestName ?? null,
          client_email: clientEmail,
          client_phone: user ? (user.user_metadata?.phone ?? null) : (guestPhone || null),
          payment_method: paymentMethod,
          card_token: cardToken,
          card_installments: installments,
          card_payment_method_id: cardPaymentMethodId,
          card_issuer_id: null,
          payer_document: cardCpf ? cardCpf.replace(/\D/g, "") : null,
        },
      });
      if (paymentMethod === "card" && result.status === "approved") {
        toast.success("Pagamento aprovado! Agendamento confirmado.");
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
                    <button key={d.iso} type="button" disabled={d.blocked} onClick={() => { setDate(d.iso); setTime(""); }}
                      className={`rounded-xl border p-3 text-center transition ${d.blocked ? "opacity-50 cursor-not-allowed" : active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:border-primary/40"}`}>
                      <div className="text-xs text-muted-foreground">{d.weekday}</div>
                      <div className="font-semibold">{d.label}</div>
                      {d.blocked ? <div className="text-[10px] text-destructive">{d.reason ?? "Indisponível"}</div> : d.range ? <div className="text-[10px] text-muted-foreground">{d.range}</div> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-sm">Selecione o Horário de Início</Label>
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
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Seu nome</Label>
                    <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={100} placeholder="Como devemos te chamar" required />
                  </div>
                  <div>
                    <Label>WhatsApp</Label>
                    <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} maxLength={20} placeholder="(47) 99999-9999" required />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Seu e-mail</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} placeholder="voce@email.com" required />
                    <p className="text-xs text-muted-foreground mt-1">Enviaremos a confirmação e o código PIX por e-mail.</p>
                  </div>
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
              <p className="text-muted-foreground text-sm">
                Revise, escolha a forma de pagamento e confirme.
              </p>
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

            {/* Seletor de método */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  type="button"
                  disabled={!pixEnabled}
                  onClick={() => setPaymentMethod("pix")}
                  className={`h-12 rounded-xl border text-sm font-semibold inline-flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed ${
                    paymentMethod === "pix"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground hover:border-primary/40"
                  }`}
                >
                  <QrCode className="h-4 w-4" /> PIX
                </button>
                <button
                  type="button"
                  disabled={!cardEnabled}
                  onClick={() => setPaymentMethod("card")}
                  title={!cardEnabled && platform === "pagseguro" ? "Cartão via PagSeguro em breve" : undefined}
                  className={`h-12 rounded-xl border text-sm font-semibold inline-flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed ${
                    paymentMethod === "card"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground hover:border-primary/40"
                  }`}
                >
                  <CreditCardIcon className="h-4 w-4" /> Cartão
                </button>
              </div>

              {paymentMethod === "pix" && (
                <div className="text-sm text-muted-foreground">
                  Após confirmar, geramos um QR Code PIX válido por 30 minutos. O agendamento é liberado assim que o pagamento é aprovado por <strong>{platform === "pagseguro" ? "PagSeguro" : "Mercado Pago"}</strong>.
                </div>
              )}

              {paymentMethod === "card" && (
                <div className="space-y-3">
                  <div>
                    <Label>Número do cartão</Label>
                    <Input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      inputMode="numeric"
                      maxLength={23}
                      placeholder="0000 0000 0000 0000"
                    />
                  </div>
                  <div>
                    <Label>Nome impresso no cartão</Label>
                    <Input
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      maxLength={40}
                      placeholder="NOME COMO NO CARTÃO"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Validade (MM/AA)</Label>
                      <Input
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        inputMode="numeric"
                        maxLength={5}
                        placeholder="12/28"
                      />
                    </div>
                    <div>
                      <Label>CVV</Label>
                      <Input
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="123"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>CPF do titular</Label>
                      <Input
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
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            {n}x de R$ {(Number(selectedPkg.price) / n).toFixed(2)}{n === 1 ? " (à vista)" : " sem juros"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Seus dados são enviados diretamente ao Mercado Pago com criptografia — nós nunca armazenamos o número do cartão.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>Voltar</Button>
              <Button size="lg" disabled={submitting} onClick={submitBooking}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {submitting ? "Enviando…" : "Confirmar pagamento"}
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

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}