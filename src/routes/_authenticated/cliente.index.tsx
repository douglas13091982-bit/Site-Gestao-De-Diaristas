import { createFileRoute, Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Calendar, MapPin, Sparkles, Users, Home, Building2, Store, Landmark } from "lucide-react";
import { useState } from "react";
import { PushNotificationButton } from "@/components/PushNotificationButton";

export const Route = createFileRoute("/_authenticated/cliente/")({
  head: () => ({ meta: [{ title: "Início — Minha conta Gersepa" }, { name: "description", content: "Resumo dos seus agendamentos." }] }),
  component: ClienteHome,
});

const STATUS: Record<string, { label: string; color: string }> = {
  pending:     { label: "Aguardando", color: "bg-amber-100 text-amber-700" },
  confirmed:   { label: "Confirmado", color: "bg-emerald-100 text-emerald-700" },
  in_progress: { label: "Em andamento", color: "bg-blue-100 text-blue-700" },
  completed:   { label: "Concluído", color: "bg-slate-200 text-slate-700" },
  cancelled:   { label: "Cancelado", color: "bg-red-100 text-red-700" },
};

const PROPERTY_TYPES = [
  { value: "casa", label: "Casa", icon: Home },
  { value: "apartamento", label: "Apartamento", icon: Building2 },
  { value: "comercial", label: "Comercial", icon: Store },
  { value: "condominio", label: "Condomínio", icon: Landmark },
];

function ClienteHome() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"quick" | "choose">("quick");
  const [propertyType, setPropertyType] = useState<string>("casa");

  const profile = useQuery({
    enabled: !!user,
    queryKey: ["cliente-home-profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("city, city_slug").eq("id", user!.id).maybeSingle()).data,
  });

  const q = useQuery({
    enabled: !!user,
    queryKey: ["cliente-home-bookings", user?.id],
    queryFn: async () => (await supabase.from("bookings")
      .select("id, service_type, city, address, booking_date, start_time, duration_hours, status, total_price")
      .or(`client_id.eq.${user!.id},client_email.eq.${user!.email}`)
      .order("booking_date", { ascending: false }).limit(3)).data ?? [],
  });

  const cityLabel = profile.data?.city || "sua cidade";

  function startBooking() {
    if (mode === "quick") {
      nav({ to: "/agendamento-rapido" });
    } else {
      nav({ to: "/professionals" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PushNotificationButton />
      </div>
      <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground p-5">
          <div className="font-bold text-xl">Agende seu Serviço</div>
          <div className="text-xs opacity-90 mt-0.5">Em {cityLabel}</div>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <div className="text-sm font-semibold mb-2">Como deseja agendar?</div>
            <div className="space-y-2">
              <button type="button" onClick={() => setMode("quick")}
                className={`w-full text-left rounded-xl border p-3 flex items-center gap-3 transition ${mode === "quick" ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border"}`}>
                <div className={`h-10 w-10 rounded-lg grid place-items-center shrink-0 ${mode === "quick" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className={`font-semibold text-sm ${mode === "quick" ? "text-primary" : ""}`}>Agendamento Rápido</div>
                  <div className="text-xs text-muted-foreground">Enviamos para várias profissionais disponíveis</div>
                </div>
              </button>
              <button type="button" onClick={() => setMode("choose")}
                className={`w-full text-left rounded-xl border p-3 flex items-center gap-3 transition ${mode === "choose" ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border"}`}>
                <div className={`h-10 w-10 rounded-lg grid place-items-center shrink-0 ${mode === "choose" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className={`font-semibold text-sm ${mode === "choose" ? "text-primary" : ""}`}>Escolher Profissional</div>
                  <div className="text-xs text-muted-foreground">Você escolhe quem vai realizar o serviço</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">Tipo de Imóvel</div>
            <div className="grid grid-cols-2 gap-2">
              {PROPERTY_TYPES.map((p) => {
                const active = propertyType === p.value;
                const Icon = p.icon;
                return (
                  <button key={p.value} type="button" onClick={() => setPropertyType(p.value)}
                    className={`rounded-xl border p-3 flex items-center gap-2 transition ${active ? "border-primary bg-primary/5 ring-2 ring-primary/20 text-primary" : "border-border text-muted-foreground"}`}>
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium truncate">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button type="button" onClick={startBooking}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 transition">
            <Sparkles className="h-4 w-4" /> Agendar Agora →
          </button>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Últimos agendamentos</h2>
          <Link to="/cliente/agendamentos" className="text-sm font-semibold text-primary">Ver todos</Link>
        </div>
        {q.isLoading && <div className="text-muted-foreground text-sm">Carregando…</div>}
        {!q.isLoading && !q.data?.length && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Você ainda não tem agendamentos.
          </div>
        )}
        <ul className="space-y-2">
          {q.data?.map((b) => {
            const s = STATUS[b.status] ?? { label: b.status, color: "bg-slate-100 text-slate-700" };
            return (
              <li key={b.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold capitalize truncate">{b.service_type ?? "Serviço"}</div>
                    <div className="text-xs text-muted-foreground mt-1 space-y-1">
                      <div className="flex items-center gap-1"><Calendar className="h-3 w-3 shrink-0" />{b.booking_date} · {b.start_time?.slice(0,5)} · {b.duration_hours}h</div>
                      <div className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{b.city} — {b.address}</span></div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${s.color}`}>{s.label}</span>
                    {b.total_price != null && <div className="mt-2 font-bold text-primary text-sm">R$ {Number(b.total_price).toFixed(2)}</div>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}