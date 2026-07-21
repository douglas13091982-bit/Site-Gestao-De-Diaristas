import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Meu painel — Gersepa" },
      { name: "description", content: "Painel do usuário Gersepa Solutions." },
      { property: "og:title", content: "Meu painel — Gersepa" },
      { property: "og:description", content: "Painel do usuário Gersepa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function fmtBRL(v: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

function Dashboard() {
  const { user, roles, signOut } = useAuth();
  const isProfessional = roles.includes("professional");
  const isAdmin = roles.includes("admin");

  const profileQ = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, phone, city")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const professionalQ = useQuery({
    queryKey: ["professional", user?.id],
    enabled: !!user && isProfessional,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name, city, hourly_rate, rating, total_reviews, total_bookings, is_verified, is_available, credits_balance")
        .eq("auth_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const professionalId = professionalQ.data?.id;

  const bookingsQ = useQuery({
    queryKey: ["bookings", user?.id, isProfessional ? professionalId : "client"],
    enabled: !!user && (!isProfessional || !!professionalId),
    queryFn: async () => {
      let q = supabase
        .from("bookings")
        .select("id, service_type, booking_date, start_time, duration_hours, city, status, total_price, payment_status, professional_id, client_user_id")
        .order("booking_date", { ascending: false })
        .limit(20);
      q = isProfessional && professionalId
        ? q.eq("professional_id", professionalId)
        : q.eq("client_user_id", user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const bookings = bookingsQ.data ?? [];
  const upcoming = bookings.filter((b) => b.status !== "cancelled" && b.booking_date && new Date(b.booking_date) >= new Date(new Date().toDateString())).length;
  const totalSpent = bookings
    .filter((b) => b.payment_status === "paid")
    .reduce((sum, b) => sum + Number(b.total_price ?? 0), 0);

  const displayName =
    profileQ.data?.name ??
    (user?.user_metadata as { name?: string } | undefined)?.name ??
    user?.email;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold">Gersepa</Link>
          <Button size="sm" variant="ghost" onClick={() => signOut()}>Sair</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <section className="space-y-1">
          <h1 className="text-3xl font-bold">Olá, {displayName}</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Administrador · " : ""}
            {isProfessional ? "Profissional" : "Cliente"}
            {profileQ.data?.city ? ` · ${profileQ.data.city}` : ""}
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={isProfessional ? "Agendamentos recebidos" : "Meus agendamentos"} value={bookings.length} loading={bookingsQ.isLoading} />
          <Stat label="Próximos" value={upcoming} loading={bookingsQ.isLoading} />
          {isProfessional ? (
            <>
              <Stat label="Avaliação" value={professionalQ.data?.rating != null ? Number(professionalQ.data.rating).toFixed(1) : "—"} loading={professionalQ.isLoading} />
              <Stat label="Créditos" value={fmtBRL(Number(professionalQ.data?.credits_balance ?? 0))} loading={professionalQ.isLoading} />
            </>
          ) : (
            <>
              <Stat label="Total pago" value={fmtBRL(totalSpent)} loading={bookingsQ.isLoading} />
              <Stat label="Cidade" value={profileQ.data?.city ?? "—"} loading={profileQ.isLoading} />
            </>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {isProfessional ? "Agendamentos recebidos" : "Meus agendamentos"}
            </h2>
          </div>

          {bookingsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : bookingsQ.error ? (
            <p className="text-sm text-destructive">
              Erro ao carregar: {(bookingsQ.error as Error).message}
            </p>
          ) : bookings.length === 0 ? (
            <div className="rounded-md border border-border p-8 text-center text-sm text-muted-foreground">
              Nenhum agendamento encontrado.
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <Th>Serviço</Th>
                    <Th>Data</Th>
                    <Th>Cidade</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Valor</Th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <Td>{b.service_type ?? "—"}</Td>
                      <Td>
                        {fmtDate(b.booking_date)}
                        {b.start_time ? ` · ${b.start_time}` : ""}
                      </Td>
                      <Td>{b.city ?? "—"}</Td>
                      <Td>
                        <StatusBadge status={b.status} />
                      </Td>
                      <Td className="text-right">{fmtBRL(Number(b.total_price ?? 0))}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, loading }: { label: string; value: React.ReactNode; loading?: boolean }) {
  return (
    <div className="rounded-md border border-border p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-1">{loading ? "…" : value}</p>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 font-medium text-xs uppercase tracking-wider text-muted-foreground ${className ?? ""}`}>{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className ?? ""}`}>{children}</td>;
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "pending";
  const map: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-600",
    confirmed: "bg-blue-500/15 text-blue-600",
    completed: "bg-green-500/15 text-green-600",
    cancelled: "bg-red-500/15 text-red-600",
  };
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${map[s] ?? "bg-muted text-muted-foreground"}`}>
      {s}
    </span>
  );
}