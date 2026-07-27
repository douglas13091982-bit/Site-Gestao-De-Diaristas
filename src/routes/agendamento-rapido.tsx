import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { sanitizeText, sanitizeTextOrNull, sanitizeEmail } from "@/shared/lib/sanitize";

const schema = z.object({
  city_slug: z.string().min(1),
  service_type: z.string().min(1),
  property_type: z.string().min(1),
  booking_date: z.string().min(1),
  start_time: z.string().min(1),
  duration_hours: z.coerce.number().min(1).max(12),
  rooms: z.coerce.number().min(0).max(20),
  bathrooms: z.coerce.number().min(0).max(20),
  address: z.string().min(3).max(200),
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
  const { user } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Preencha os campos"); return; }
    setLoading(true);
    try {
      const cityName = cities.data?.find(c => c.slug === parsed.data.city_slug)?.name ?? parsed.data.city_slug;
      const emailInput = user?.email ?? (fd.get("email") as string) ?? null;
      const cleanEmail = emailInput ? sanitizeEmail(emailInput) : null;
      const { data: inserted, error } = await supabase.from("bookings").insert({
        ...parsed.data,
        city: sanitizeText(cityName, { maxLength: 80, collapseWhitespace: true }),
        address: sanitizeText(parsed.data.address, { maxLength: 200, collapseWhitespace: true }),
        notes: sanitizeTextOrNull(parsed.data.notes, { maxLength: 500 }),
        booking_type: "quick",
        status: "pending",
        payment_status: "pending",
        client_id: user?.id ?? null,
        client_email: cleanEmail,
      }).select("id").maybeSingle();
      if (error) throw error;
      if (inserted?.id) {
        try {
          const { broadcastNewBookingPush } = await import("@/lib/push.functions");
          await broadcastNewBookingPush({ data: { bookingId: inserted.id } });
        } catch (pushErr) {
          console.warn("[push] falha ao notificar diaristas", pushErr);
        }
      }
      toast.success("Solicitação enviada! Você receberá propostas em breve.");
      nav({ to: user ? "/bookings" : "/" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">Agendamento rápido</h1>
        <p className="text-muted-foreground mb-6">Diga o que você precisa e receberá propostas de diaristas verificadas.</p>
        <form onSubmit={onSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Cidade</Label>
              <select name="city_slug" required className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Selecione…</option>
                {cities.data?.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div><Label>Serviço</Label>
              <select name="service_type" required className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Selecione…</option>
                {cats.data?.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div><Label>Tipo de imóvel</Label>
              <select name="property_type" required className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Selecione…</option>
                <option value="apartamento">Apartamento</option>
                <option value="casa">Casa</option>
                <option value="comercial">Comercial</option>
              </select>
            </div>
            <div><Label>Duração (horas)</Label>
              <select name="duration_hours" required className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Selecione um plano…</option>
                {packages.data?.map(p => (
                  <option key={p.id} value={p.duration_hours}>
                    {p.duration_hours}h — R$ {Number(p.price).toFixed(2).replace(".", ",")}
                  </option>
                ))}
              </select>
            </div>
            <div><Label>Data</Label><Input name="booking_date" type="date" required /></div>
            <div><Label>Início</Label><Input name="start_time" type="time" defaultValue="08:00" required /></div>
            <div><Label>Quartos</Label><Input name="rooms" type="number" min={0} defaultValue={2} required /></div>
            <div><Label>Banheiros</Label><Input name="bathrooms" type="number" min={0} defaultValue={1} required /></div>
          </div>
          <div><Label>Endereço</Label><Input name="address" required maxLength={200} /></div>
          <div><Label>Observações</Label><Textarea name="notes" rows={3} maxLength={500} /></div>
          {!user && (<div><Label>Seu email para contato</Label><Input name="email" type="email" required maxLength={255} /></div>)}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Enviando…" : "Solicitar agora"}</Button>
        </form>
      </div>
    </div>
  );
}