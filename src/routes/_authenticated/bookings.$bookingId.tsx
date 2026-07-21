import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/bookings/$bookingId")({
  head: () => ({
    meta: [
      { title: "Detalhes do agendamento — Gersepa" },
      { name: "description", content: "Informações completas, histórico e ações do agendamento." },
      { property: "og:title", content: "Detalhes do agendamento — Gersepa" },
      { property: "og:description", content: "Detalhes de um agendamento Gersepa Solutions." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookingDetail,
});

const sel = (s: string): string => s;

interface BookingFull {
  id: number;
  service_type: string | null;
  booking_date: string | null;
  start_time: string | null;
  duration_hours: number | null;
  rooms: number | null;
  bathrooms: number | null;
  address: string | null;
  address_complement: string | null;
  city: string | null;
  notes: string | null;
  status: string | null;
  total_price: number | null;
  payment_status: string | null;
  payment_method: string | null;
  booking_type: string | null;
  professional_id: number | null;
  client_user_id: string | null;
  client_email: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ProfessionalRow {
  id: number;
  auth_user_id: string | null;
  name: string | null;
  phone: string | null;
  city: string | null;
  rating: number | null;
  total_reviews: number | null;
  photo_url: string | null;
}

interface ProfileRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
}

interface ReviewRow {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string | null;
}

function fmtBRL(v: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR");
}
function fmtDateTime(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR");
}

function BookingDetail() {
  const { bookingId } = Route.useParams();
  const idNum = Number(bookingId);
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const isAdmin = roles.includes("admin");
  const isProfRole = roles.includes("professional");

  const bookingQ = useQuery({
    queryKey: ["booking", idNum],
    enabled: Number.isFinite(idNum),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(sel("id, service_type, booking_date, start_time, duration_hours, rooms, bathrooms, address, address_complement, city, notes, status, total_price, payment_status, payment_method, booking_type, professional_id, client_user_id, client_email, created_at, updated_at"))
        .eq("id", idNum)
        .maybeSingle()
        .returns<BookingFull | null>();
      if (error) throw error;
      return data;
    },
  });

  const b = bookingQ.data ?? null;

  const professionalQ = useQuery({
    queryKey: ["booking-professional", b?.professional_id],
    enabled: !!b?.professional_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select(sel("id, auth_user_id, name, phone, city, rating, total_reviews, photo_url"))
        .eq("id", b!.professional_id!)
        .maybeSingle()
        .returns<ProfessionalRow | null>();
      if (error) throw error;
      return data;
    },
  });

  const clientQ = useQuery({
    queryKey: ["booking-client", b?.client_user_id],
    enabled: !!b?.client_user_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(sel("id, name, email, phone, city"))
        .eq("id", b!.client_user_id!)
        .maybeSingle()
        .returns<ProfileRow | null>();
      if (error) throw error;
      return data;
    },
  });

  const reviewsQ = useQuery({
    queryKey: ["booking-reviews", idNum],
    enabled: Number.isFinite(idNum),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select(sel("id, rating, comment, created_at"))
        .eq("booking_id", idNum)
        .order("created_at", { ascending: false })
        .returns<ReviewRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });

  const professional = professionalQ.data ?? null;
  const client = clientQ.data ?? null;

  const isOwnerClient = !!user && b?.client_user_id === user.id;
  const isOwnerProfessional =
    !!user && isProfRole && !!professional?.auth_user_id && professional.auth_user_id === user.id;
  const canAct = isAdmin || isOwnerClient || isOwnerProfessional;

  const setStatus = useMutation({
    mutationFn: async (nextStatus: string) => {
      const { error } = await supabase
        .from("bookings")
        .update({ status: nextStatus })
        .eq("id", idNum);
      if (error) throw error;
      return nextStatus;
    },
    onSuccess: (nextStatus) => {
      toast.success(`Status atualizado para "${nextStatus}"`);
      qc.invalidateQueries({ queryKey: ["booking", idNum] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar status");
    },
  });

  if (!Number.isFinite(idNum)) {
    return <Shell><p className="text-sm text-destructive">ID de agendamento inválido.</p></Shell>;
  }

  if (bookingQ.isLoading) {
    return <Shell><p className="text-sm text-muted-foreground">Carregando...</p></Shell>;
  }

  if (bookingQ.error) {
    return (
      <Shell>
        <p className="text-sm text-destructive">
          Erro ao carregar: {(bookingQ.error as Error).message}
        </p>
      </Shell>
    );
  }

  if (!b) {
    return (
      <Shell>
        <div className="rounded-md border border-border p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Agendamento não encontrado.</p>
          <Link to="/dashboard"><Button variant="outline" size="sm">Voltar ao painel</Button></Link>
        </div>
      </Shell>
    );
  }

  const status = b.status ?? "pending";

  return (
    <Shell>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Agendamento #{b.id}
          </p>
          <h1 className="text-3xl font-bold">{b.service_type ?? "Serviço"}</h1>
          <p className="text-sm text-muted-foreground">
            {fmtDate(b.booking_date)}{b.start_time ? ` · ${b.start_time}` : ""}
            {b.duration_hours ? ` · ${b.duration_hours}h` : ""}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Detalhes do serviço">
          <Field label="Tipo">{b.service_type ?? "—"}</Field>
          <Field label="Modalidade">{b.booking_type ?? "—"}</Field>
          <Field label="Cômodos">{b.rooms ?? "—"}</Field>
          <Field label="Banheiros">{b.bathrooms ?? "—"}</Field>
          <Field label="Endereço">
            {b.address ?? "—"}
            {b.address_complement ? ` — ${b.address_complement}` : ""}
          </Field>
          <Field label="Cidade">{b.city ?? "—"}</Field>
          {b.notes ? <Field label="Observações">{b.notes}</Field> : null}
        </Section>

        <Section title="Pagamento">
          <Field label="Valor total">{fmtBRL(Number(b.total_price ?? 0))}</Field>
          <Field label="Status">{b.payment_status ?? "—"}</Field>
          <Field label="Método">{b.payment_method ?? "—"}</Field>
          <Field label="Criado em">{fmtDateTime(b.created_at)}</Field>
          <Field label="Atualizado em">{fmtDateTime(b.updated_at)}</Field>
        </Section>

        <Section title="Profissional">
          {professionalQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : professional ? (
            <>
              <Field label="Nome">{professional.name ?? "—"}</Field>
              <Field label="Telefone">{professional.phone ?? "—"}</Field>
              <Field label="Cidade">{professional.city ?? "—"}</Field>
              <Field label="Avaliação">
                {professional.rating != null ? Number(professional.rating).toFixed(1) : "—"}
                {professional.total_reviews ? ` (${professional.total_reviews})` : ""}
              </Field>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Profissional não vinculado.</p>
          )}
        </Section>

        <Section title="Cliente">
          {clientQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : client ? (
            <>
              <Field label="Nome">{client.name ?? "—"}</Field>
              <Field label="E-mail">{client.email ?? b.client_email ?? "—"}</Field>
              <Field label="Telefone">{client.phone ?? "—"}</Field>
              <Field label="Cidade">{client.city ?? "—"}</Field>
            </>
          ) : (
            <>
              <Field label="E-mail">{b.client_email ?? "—"}</Field>
              <p className="text-xs text-muted-foreground">Cliente sem perfil vinculado.</p>
            </>
          )}
        </Section>
      </div>

      <Section title="Histórico e avaliações">
        {reviewsQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (reviewsQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma avaliação para este agendamento.</p>
        ) : (
          <ul className="space-y-3">
            {reviewsQ.data!.map((r) => (
              <li key={r.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Nota: {r.rating}/5</span>
                  <span className="text-xs text-muted-foreground">{fmtDateTime(r.created_at)}</span>
                </div>
                {r.comment ? <p className="text-sm mt-1">{r.comment}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Ações">
        {!canAct ? (
          <p className="text-sm text-muted-foreground">Você não tem permissão para alterar este agendamento.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(isOwnerProfessional || isAdmin) && status === "pending" && (
              <Button
                size="sm"
                onClick={() => setStatus.mutate("confirmed")}
                disabled={setStatus.isPending}
              >
                Confirmar
              </Button>
            )}
            {(isOwnerProfessional || isAdmin) && status === "confirmed" && (
              <Button
                size="sm"
                onClick={() => setStatus.mutate("completed")}
                disabled={setStatus.isPending}
              >
                Marcar como concluído
              </Button>
            )}
            {(isOwnerClient || isOwnerProfessional || isAdmin) &&
              status !== "cancelled" &&
              status !== "completed" && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Tem certeza que deseja cancelar este agendamento?")) {
                      setStatus.mutate("cancelled");
                    }
                  }}
                  disabled={setStatus.isPending}
                >
                  Cancelar agendamento
                </Button>
              )}
            <Button size="sm" variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
              Voltar ao painel
            </Button>
          </div>
        )}
      </Section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold">Gersepa</Link>
          <Link to="/dashboard"><Button size="sm" variant="ghost">Painel</Button></Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">{children}</main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="rounded-md border border-border p-4 space-y-2">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2">{children}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-600",
    confirmed: "bg-blue-500/15 text-blue-600",
    completed: "bg-green-500/15 text-green-600",
    cancelled: "bg-red-500/15 text-red-600",
  };
  return (
    <span className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}