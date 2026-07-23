import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, MapPin, Copy, Home as HomeIcon, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getGuestBooking } from "@/lib/guest-booking.functions";

const searchSchema = z.object({
  t: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/agendamento-sucesso/$id")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Agendamento confirmado — Gersepa Solutions" },
      { name: "description", content: "Seu agendamento foi criado com sucesso. Finalize o pagamento via PIX." },
      { property: "og:title", content: "Agendamento confirmado — Gersepa" },
      { property: "og:description", content: "Confirmação do seu agendamento e código PIX." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { id } = Route.useParams();
  const { t } = Route.useSearch();

  const guest = useQuery({
    queryKey: ["guest-booking", id, t],
    queryFn: () => getGuestBooking({ data: { id: Number(id), token: t } }),
    refetchInterval: (q) => (q.state.data?.booking.payment_status === "paid" ? false : 5000),
    retry: false,
  });
  const booking = { data: guest.data?.booking, isLoading: guest.isLoading, error: guest.error };
  const pro = { data: guest.data?.professional ?? null };

  if (booking.isLoading) {
    return <div className="min-h-screen bg-secondary/40"><Header /><div className="max-w-2xl mx-auto p-10 text-center text-muted-foreground">Carregando…</div></div>;
  }
  if (booking.error || !booking.data) {
    return (
      <div className="min-h-screen bg-secondary/40">
        <Header />
        <div className="max-w-2xl mx-auto p-10 text-center space-y-4">
          <h1 className="text-2xl font-bold">Agendamento não encontrado</h1>
          <p className="text-muted-foreground">O link pode estar incorreto ou expirado.</p>
          <Link to="/"><Button>Voltar para o início</Button></Link>
        </div>
      </div>
    );
  }

  const b = booking.data!;
  const pixKey = pro.data?.pix_key ?? null;
  const isPaid = b.payment_status === "paid";

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 grid place-items-center mb-4">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-extrabold">Agendamento criado!</h1>
          <p className="text-muted-foreground mt-2">
            Olá {b.client_name?.split(" ")[0] ?? "cliente"}, recebemos sua solicitação #{b.id}.
            Finalize o pagamento via PIX para confirmar.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-4">
          <h2 className="font-bold text-lg">Resumo do serviço</h2>
          {pro.data && (
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              {pro.data.profile_photo ? (
                <img src={pro.data.profile_photo} alt="" className="h-12 w-12 rounded-xl object-cover border" />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center font-bold">{pro.data.full_name?.[0] ?? "?"}</div>
              )}
              <div>
                <div className="text-xs text-muted-foreground">Diarista</div>
                <div className="font-semibold">{pro.data.full_name}</div>
              </div>
            </div>
          )}
          <Row icon={<Clock className="h-4 w-4" />} label="Data e horário" value={`${formatDate(b.booking_date)} · ${b.start_time?.slice(0,5)} · ${b.duration_hours}h`} />
          <Row icon={<MapPin className="h-4 w-4" />} label="Endereço" value={`${b.address}${b.city ? `, ${b.city}` : ""}`} />
          <div className="flex justify-between items-center pt-3 border-t border-border">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-xl text-primary">R$ {Number(b.total_price ?? b.payment_amount ?? 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">Pagamento via PIX</h2>
          {isPaid ? (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <div className="font-semibold">Pagamento confirmado!</div>
                <div className="text-sm">Sua diarista foi notificada e confirmará em instantes.</div>
              </div>
            </div>
          ) : b.payment_pix_code ? (
            <div className="space-y-4">
              {b.payment_qr_base64 && (
                <div className="flex justify-center">
                  <img
                    src={`data:image/png;base64,${b.payment_qr_base64}`}
                    alt="QR Code PIX"
                    className="h-56 w-56 rounded-xl border border-border bg-white p-2"
                  />
                </div>
              )}
              <p className="text-sm text-muted-foreground text-center">
                Escaneie o QR Code ou use o código copia-e-cola abaixo para pagar <strong>R$ {Number(b.total_price ?? 0).toFixed(2)}</strong>.
              </p>
              <PixBlock code={b.payment_pix_code} />
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Aguardando confirmação do pagamento…
              </div>
            </div>
          ) : pixKey ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Faça um PIX para a chave abaixo, no valor de <strong>R$ {Number(b.total_price ?? 0).toFixed(2)}</strong>. Envie o comprovante para a diarista.</p>
              <PixBlock code={pixKey} label="Chave PIX" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Em instantes você receberá o código PIX por e-mail e WhatsApp.</p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Link to="/"><Button variant="outline" className="w-full gap-2"><HomeIcon className="h-4 w-4" /> Voltar ao início</Button></Link>
          {pro.data?.phone && (
            <a href={`https://wa.me/55${pro.data.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Sou ${b.client_name ?? "seu cliente"} do agendamento #${b.id}.`)}`} target="_blank" rel="noopener noreferrer">
              <Button className="w-full gap-2"><MessageCircle className="h-4 w-4" /> Falar com a diarista</Button>
            </a>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Guarde este link — ele é o acesso ao seu agendamento. Também enviamos por e-mail para <strong>{b.client_email}</strong>.
        </p>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}

function PixBlock({ code, label = "Copia e cola PIX" }: { code: string; label?: string }) {
  async function copy() {
    try { await navigator.clipboard.writeText(code); toast.success("Copiado!"); }
    catch { toast.error("Não foi possível copiar"); }
  }
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="flex gap-2">
        <code className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs break-all">{code}</code>
        <Button type="button" variant="outline" size="icon" onClick={copy}><Copy className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}