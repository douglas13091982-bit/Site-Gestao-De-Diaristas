import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createPayment } from "@/lib/mercadopago.functions";
import { QrCode, CreditCard as CreditCardIcon, ArrowLeft } from "lucide-react";

const schema = z.object({
  city_slug: z.string().min(1),
  service_type: z.string().min(1),
  property_type: z.string().min(1),
  booking_date: z.string().min(1),
  start_time: z.string().min(1),
  package_id: z.coerce.number().int().positive(),
  rooms: z.coerce.number().min(0).max(20),
  bathrooms: z.coerce.number().min(0).max(20),
  notes: z.string().max(500).optional(),
});

export const Route = createFileRoute("/agendamento-rapido")({
  head: () => ({
    meta: [
      { title: "Agendamento rápido — Gersepa Solutions" },
      { name: "description", content: "Solicite uma diarista em poucos passos. Receba propostas de profissionais verificadas." },
      { property: "og:title", content: "Agendamento rápido — Gersepa" },
      { property: "og:description", content: "Solicite uma diarista em minutos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuickBookingPage,
});

function QuickBookingPage() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const runCreatePayment = useServerFn(createPayment);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<z.infer<typeof schema> | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardCpf, setCardCpf] = useState("");
  const [installments, setInstallments] = useState(1);

  // Data/hora "agora" no fuso America/Sao_Paulo (evita agendar no passado).
  const brNow = (() => {
    try {
      const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false,
      });
      const p = Object.fromEntries(fmt.formatToParts(new Date()).map(x => [x.type, x.value]));
      return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
    } catch { return { date: "", time: "" }; }
  })();

  const cities = useQuery({
    queryKey: ["qb-cities"],
    queryFn: async () => (await supabase.from("available_cities").select("slug, name").eq("is_enabled", true).order("name")).data ?? [],
  });
  const cats = useQuery({
    queryKey: ["qb-cats"],
    queryFn: async () => (await supabase.from("profession_categories").select("slug, name").eq("is_enabled", true).order("display_order")).data ?? [],
  });
  const packages = useQuery({
    queryKey: ["qb-packages"],
    queryFn: async () => (await supabase.from("pricing_packages").select("id, duration_hours, price, start_time").eq("is_enabled", true).order("display_order")).data ?? [],
  });

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

  const meProfile = useQuery({
    enabled: !!user?.id,
    queryKey: ["qb-me", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("full_name, phone, cpf").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const platform = paySettings.data?.platform ?? "mercadopago";
  const pixEnabled = paySettings.data?.pixEnabled ?? true;
  const cardEnabled = (paySettings.data?.cardEnabled ?? true) && platform === "mercadopago";
  const selectedPkg = packages.data?.find(p => p.id === formData?.package_id) ?? null;

  useEffect(() => {
    if (paymentMethod === "pix" && !pixEnabled && cardEnabled) setPaymentMethod("card");
    if (paymentMethod === "card" && !cardEnabled && pixEnabled) setPaymentMethod("pix");
  }, [pixEnabled, cardEnabled, paymentMethod]);

  useEffect(() => {
    if (step !== 2 || paymentMethod !== "card" || platform !== "mercadopago") return;
    if (typeof window === "undefined") return;
    if ((window as unknown as { MercadoPago?: unknown }).MercadoPago) return;
    const s = document.createElement("script");
    s.src = "https://sdk.mercadopago.com/js/v2";
    s.async = true;
    document.head.appendChild(s);
  }, [step, paymentMethod, platform]);

  useEffect(() => {
    const p = meProfile.data;
    if (!p) return;
    if (!cardHolder && p.full_name) setCardHolder(p.full_name);
    if (!cardCpf && p.cpf) setCardCpf(String(p.cpf));
  }, [meProfile.data]);

  function onSubmitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Preencha os campos"); return; }
    // Bloqueia data/hora no passado (fuso America/Sao_Paulo, buffer 1h).
    if (parsed.data.booking_date < brNow.date) {
      toast.error("Escolha uma data futura."); return;
    }
    if (parsed.data.booking_date === brNow.date) {
      const [h, m] = parsed.data.start_time.split(":").map(Number);
      const [nh, nm] = brNow.time.split(":").map(Number);
      if (h * 60 + m < nh * 60 + nm + 60) {
        toast.error("Escolha um horário com pelo menos 1h de antecedência."); return;
      }
    }
    setFormData(parsed.data);
    setStep(2);
  }

  async function submitPayment() {
    if (!formData || !selectedPkg || !user) return;
    setLoading(true);
    try {
      const cityName = cities.data?.find(c => c.slug === formData.city_slug)?.name ?? formData.city_slug;

      let cardToken: string | null = null;
      let cardPaymentMethodId: string | null = null;
      if (paymentMethod === "card") {
        if (platform !== "mercadopago") throw new Error("Cartão disponível apenas via Mercado Pago no momento.");
        const publicKey = paySettings.data?.mpPublicKey;
        if (!publicKey) throw new Error("Cartão indisponível: peça ao administrador para preencher a Public Key.");
        const digits = cardNumber.replace(/\D/g, "");
        const [mmRaw, yyRaw] = cardExpiry.split("/");
        const mm = (mmRaw || "").padStart(2, "0");
        const yy = (yyRaw || "").slice(-2);
        const cpfDigits = cardCpf.replace(/\D/g, "");
        if (digits.length < 13 || !mm || !yy || cardCvv.length < 3 || !cardHolder.trim() || cpfDigits.length !== 11) {
          throw new Error("Preencha corretamente os dados do cartão e o CPF.");
        }
        const MP = (window as unknown as { MercadoPago?: new (k: string) => unknown }).MercadoPago;
        if (!MP) throw new Error("SDK do cartão ainda carregando. Aguarde e tente novamente.");
        const mp = new MP(publicKey) as {
          getPaymentMethods: (opts: { bin: string }) => Promise<{ results?: Array<{ id: string }> }>;
          createCardToken: (opts: Record<string, string>) => Promise<{ id?: string }>;
        };
        try {
          const methodsRes = await mp.getPaymentMethods({ bin: digits.slice(0, 8) });
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
        if (!cardToken) throw new Error("Não foi possível validar o cartão.");
      }

      const result = await runCreatePayment({
        data: {
          professional_id: null,
          booking_type: "quick",
          service_type: formData.service_type,
          package_id: selectedPkg.id,
          booking_date: formData.booking_date,
          start_time: formData.start_time,
          property_type: formData.property_type,
          rooms: formData.rooms,
          bathrooms: formData.bathrooms,
          address: null,
          city: cityName,
          city_slug: formData.city_slug,
          notes: formData.notes || null,
          client_name: meProfile.data?.full_name ?? user.user_metadata?.full_name ?? null,
          client_email: user.email!,
          client_phone: meProfile.data?.phone ?? null,
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
        toast.success("Pagamento aprovado! Distribuindo para as diaristas.");
      } else if (paymentMethod === "card" && result.status === "rejected") {
        toast.error("Pagamento recusado. Verifique os dados do cartão.");
        return;
      } else if (paymentMethod === "card") {
        toast.info(`Pagamento em análise (${result.status}).`);
      } else {
        toast.success("Cobrança PIX gerada! Após o pagamento, as diaristas serão notificadas.");
      }
      nav({
        to: "/agendamento-sucesso/$id",
        params: { id: String(result.bookingId) },
        search: { t: result.guestToken },
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar pagamento");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      {authLoading ? (
        <div className="max-w-2xl mx-auto px-6 py-10 text-center text-muted-foreground">Carregando…</div>
      ) : !user ? (
        <div className="max-w-md mx-auto px-6 py-16">
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4 shadow-sm">
            <h1 className="text-2xl font-bold">Entre para agendar</h1>
            <p className="text-muted-foreground">
              Para fazer um agendamento rápido você precisa ter uma conta com seu endereço completo. Faça login ou cadastre-se em segundos.
            </p>
            <div className="grid gap-2 pt-2">
              <Link to="/auth" search={{ redirect: "/agendamento-rapido" } as never}>
                <Button className="w-full">Entrar</Button>
              </Link>
              <Link to="/cadastro">
                <Button variant="outline" className="w-full">Criar conta</Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">Agendamento rápido</h1>
        <p className="text-muted-foreground mb-6">
          {step === 1
            ? "Diga o que você precisa. Após o pagamento, notificaremos todas as diaristas disponíveis — quem aceitar primeiro, leva."
            : "Efetue o pagamento para liberar sua solicitação às diaristas."}
        </p>
        {step === 1 && (
        <form onSubmit={onSubmitForm} className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Cidade</Label>
              <select name="city_slug" required defaultValue={formData?.city_slug ?? ""} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Selecione…</option>
                {cities.data?.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div><Label>Serviço</Label>
              <select name="service_type" required defaultValue={formData?.service_type ?? ""} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Selecione…</option>
                {cats.data?.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div><Label>Tipo de imóvel</Label>
              <select name="property_type" required defaultValue={formData?.property_type ?? ""} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Selecione…</option>
                <option value="apartamento">Apartamento</option>
                <option value="casa">Casa</option>
                <option value="comercial">Comercial</option>
              </select>
            </div>
            <div><Label>Plano</Label>
              <select name="package_id" required defaultValue={formData?.package_id ?? ""} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Selecione um plano…</option>
                {packages.data?.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.duration_hours}h — R$ {Number(p.price).toFixed(2).replace(".", ",")}
                  </option>
                ))}
              </select>
            </div>
            <div><Label>Data</Label><Input name="booking_date" type="date" min={brNow.date} defaultValue={formData?.booking_date ?? ""} required /></div>
            <div><Label>Início</Label><Input name="start_time" type="time" defaultValue={formData?.start_time ?? "08:00"} required /></div>
            <div><Label>Quartos</Label><Input name="rooms" type="number" min={0} defaultValue={formData?.rooms ?? 2} required /></div>
            <div><Label>Banheiros</Label><Input name="bathrooms" type="number" min={0} defaultValue={formData?.bathrooms ?? 1} required /></div>
          </div>
          <div><Label>Observações</Label><Textarea name="notes" rows={3} maxLength={500} defaultValue={formData?.notes ?? ""} /></div>
          <Button type="submit" className="w-full">Continuar para pagamento</Button>
        </form>
        )}
        {step === 2 && selectedPkg && formData && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <button onClick={() => setStep(1)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4" /> Voltar e editar
            </button>
            <div className="rounded-xl bg-secondary/40 p-4 text-sm space-y-1">
              <div className="flex justify-between"><span>Plano</span><span className="font-medium">{selectedPkg.duration_hours}h</span></div>
              <div className="flex justify-between"><span>Data</span><span className="font-medium">{formData.booking_date} · {formData.start_time}</span></div>
              <div className="flex justify-between text-base pt-2 border-t border-border/60"><span>Total</span><span className="font-bold text-primary">R$ {Number(selectedPkg.price).toFixed(2).replace(".", ",")}</span></div>
            </div>

            <div>
              <Label className="mb-2 block">Método de pagamento</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={!pixEnabled} onClick={() => setPaymentMethod("pix")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm transition ${paymentMethod === "pix" ? "border-primary bg-primary/5 text-primary" : "border-border"} ${!pixEnabled ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <QrCode className="h-4 w-4" /> PIX
                </button>
                <button type="button" disabled={!cardEnabled} onClick={() => setPaymentMethod("card")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm transition ${paymentMethod === "card" ? "border-primary bg-primary/5 text-primary" : "border-border"} ${!cardEnabled ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <CreditCardIcon className="h-4 w-4" /> Cartão
                </button>
              </div>
            </div>

            {paymentMethod === "card" && (
              <div className="space-y-3">
                <div><Label>Nome no cartão</Label><Input value={cardHolder} onChange={e => setCardHolder(e.target.value)} placeholder="Como está impresso" /></div>
                <div><Label>Número do cartão</Label><Input value={cardNumber} onChange={e => setCardNumber(e.target.value)} inputMode="numeric" placeholder="0000 0000 0000 0000" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Validade</Label><Input value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} placeholder="MM/AA" /></div>
                  <div><Label>CVV</Label><Input value={cardCvv} onChange={e => setCardCvv(e.target.value)} inputMode="numeric" placeholder="123" /></div>
                  <div><Label>Parcelas</Label>
                    <select value={installments} onChange={e => setInstallments(Number(e.target.value))} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-2 text-sm">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}x</option>)}
                    </select>
                  </div>
                </div>
                <div><Label>CPF do titular</Label><Input value={cardCpf} onChange={e => setCardCpf(e.target.value)} inputMode="numeric" placeholder="000.000.000-00" /></div>
              </div>
            )}

            {paymentMethod === "pix" && (
              <p className="text-xs text-muted-foreground">Você receberá um QR Code PIX na próxima tela. Assim que o pagamento for confirmado, sua solicitação será enviada para todas as diaristas disponíveis.</p>
            )}

            <Button onClick={submitPayment} disabled={loading} className="w-full">
              {loading ? "Processando…" : "Confirmar pagamento"}
            </Button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}