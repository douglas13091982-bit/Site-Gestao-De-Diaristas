import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  from: fallback(z.string(), "").default(""),
  to: fallback(z.string(), "").default(""),
  status: fallback(z.string(), "").default(""),
  professional: fallback(z.string(), "").default(""),
  page: fallback(z.number().int(), 1).default(1),
  pageSize: fallback(z.number().int(), 20).default(20),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: zodValidator(searchSchema),
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

// Cast select strings to plain string to keep supabase-js from parsing
// them at the type level (keeps typecheck fast on conditional builders).
const sel = (s: string): string => s;

interface BookingRow {
  id: number;
  service_type: string | null;
  booking_date: string | null;
  start_time: string | null;
  duration_hours: number | null;
  city: string | null;
  status: string | null;
  total_price: number | null;
  payment_status: string | null;
  professional_id: number | null;
  client_user_id: string | null;
}

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
];

function Dashboard() {
  const { user, roles, signOut } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { from, to, status, professional } = search;
  const page = Math.max(1, search.page);
  const pageSize = [10, 20, 50, 100].includes(search.pageSize) ? search.pageSize : 20;
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
    queryKey: [
      "bookings",
      user?.id,
      isProfessional ? professionalId : "client",
      { from, to, status, page, pageSize },
    ],
    enabled: !!user && (!isProfessional || !!professionalId),
    queryFn: async () => {
      const fromIdx = (page - 1) * pageSize;
      const toIdx = fromIdx + pageSize - 1;
      let q = supabase
        .from("bookings")
        .select(
          sel(
            "id, service_type, booking_date, start_time, duration_hours, city, status, total_price, payment_status, professional_id, client_user_id",
          ),
          { count: "exact" },
        )
        .order("booking_date", { ascending: false })
        .range(fromIdx, toIdx);
      q = isProfessional && professionalId
        ? q.eq("professional_id", professionalId)
        : q.eq("client_user_id", user!.id);
      if (status) q = q.eq("status", status);
      if (from) q = q.gte("booking_date", from);
      if (to) q = q.lte("booking_date", to);
      const { data, error, count } = await q.returns<BookingRow[]>();
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const rawBookings = bookingsQ.data?.rows ?? [];
  const totalCount = bookingsQ.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const professionalIds = useMemo(
    () =>
      Array.from(
        new Set(
          rawBookings
            .map((b) => b.professional_id)
            .filter((id): id is number => id != null),
        ),
      ),
    [rawBookings],
  );

  const profNamesQ = useQuery({
    queryKey: ["professional-names", professionalIds],
    enabled: professionalIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name")
        .in("id", professionalIds);
      if (error) throw error;
      const map: Record<number, string> = {};
      for (const row of data ?? []) map[row.id] = row.name ?? "";
      return map;
    },
  });

  const profNames = profNamesQ.data ?? {};
  const profQuery = professional.trim().toLowerCase();

  const bookings = useMemo(() => {
    if (!profQuery) return rawBookings;
    return rawBookings.filter((b) => {
      const name = b.professional_id ? profNames[b.professional_id] ?? "" : "";
      return name.toLowerCase().includes(profQuery);
    });
  }, [rawBookings, profNames, profQuery]);

  const upcoming = bookings.filter((b) => b.status !== "cancelled" && b.booking_date && new Date(b.booking_date) >= new Date(new Date().toDateString())).length;
  const totalSpent = bookings
    .filter((b) => b.payment_status === "paid")
    .reduce((sum, b) => sum + Number(b.total_price ?? 0), 0);

  const activeFilterCount =
    (from ? 1 : 0) + (to ? 1 : 0) + (status ? 1 : 0) + (professional ? 1 : 0);

  // Any filter change resets page to 1 unless the patch already sets page.
  function update(patch: Partial<typeof search>) {
    navigate({
      search: (prev: typeof search) => ({
        ...prev,
        ...patch,
        page: patch.page ?? 1,
      }),
    });
  }
  function goToPage(next: number) {
    const clamped = Math.max(1, Math.min(totalPages, next));
    navigate({ search: (prev: typeof search) => ({ ...prev, page: clamped }) });
  }
  function reset() {
    navigate({
      search: { from: "", to: "", status: "", professional: "", page: 1, pageSize },
    });
  }

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
            {activeFilterCount > 0 ? (
              <Button size="sm" variant="ghost" onClick={reset}>
                Limpar filtros ({activeFilterCount})
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-md border border-border p-4">
            <div className="space-y-1">
              <Label htmlFor="f-from">Data inicial</Label>
              <Input
                id="f-from"
                type="date"
                value={from}
                onChange={(e) => update({ from: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="f-to">Data final</Label>
              <Input
                id="f-to"
                type="date"
                value={to}
                onChange={(e) => update({ to: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="f-status">Status</Label>
              <select
                id="f-status"
                value={status}
                onChange={(e) => update({ status: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="f-prof">Profissional</Label>
              <Input
                id="f-prof"
                placeholder="Buscar por nome..."
                value={professional}
                onChange={(e) => update({ professional: e.target.value })}
                disabled={isProfessional && !isAdmin}
              />
            </div>
          </div>

          {bookingsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : bookingsQ.error ? (
            <p className="text-sm text-destructive">
              Erro ao carregar: {(bookingsQ.error as Error).message}
            </p>
          ) : bookings.length === 0 ? (
            <div className="rounded-md border border-border p-8 text-center text-sm text-muted-foreground">
              {activeFilterCount > 0
                ? "Nenhum agendamento corresponde aos filtros aplicados."
                : "Nenhum agendamento encontrado."}
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <Th>Serviço</Th>
                    <Th>Data</Th>
                    <Th>Profissional</Th>
                    <Th>Cidade</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Valor</Th>
                    <Th className="text-right">Ações</Th>
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
                      <Td>
                        {b.professional_id ? profNames[b.professional_id] ?? "…" : "—"}
                      </Td>
                      <Td>{b.city ?? "—"}</Td>
                      <Td>
                        <StatusBadge status={b.status} />
                      </Td>
                      <Td className="text-right">{fmtBRL(Number(b.total_price ?? 0))}</Td>
                      <Td className="text-right">
                        <Link
                          to="/bookings/$bookingId"
                          params={{ bookingId: String(b.id) }}
                          className="text-primary hover:underline text-xs font-medium"
                        >
                          Ver detalhes
                        </Link>
                      </Td>
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