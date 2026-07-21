import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/quick-booking")({
  head: () => ({
    meta: [
      { title: "Agendamento rápido — Gersepa Solutions" },
      { name: "description", content: "Agende um serviço de limpeza em minutos com a Gersepa Solutions." },
      { property: "og:title", content: "Agendamento rápido — Gersepa Solutions" },
      { property: "og:description", content: "Agende um serviço em minutos." },
    ],
  }),
  component: QuickBooking,
});

function QuickBooking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [pkgId, setPkgId] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const citiesQ = useQuery({
    queryKey: ["cities-qb"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("available_cities")
        .select("name")
        .eq("is_enabled", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const packagesQ = useQuery({
    queryKey: ["packages-qb"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_packages")
        .select("id, duration_hours, price, start_time")
        .eq("is_enabled", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    const pkg = (packagesQ.data ?? []).find((p) => String(p.id) === pkgId);
    if (!pkg) { setErrorMsg("Escolha um pacote."); return; }
    if (!city || !date) { setErrorMsg("Preencha cidade e data."); return; }
    setSaving(true);
    const { error } = await supabase.from("bookings").insert({
      client_user_id: user.id,
      service_type: "Limpeza",
      city,
      booking_date: date,
      start_time: time || pkg.start_time,
      duration_hours: pkg.duration_hours,
      total_price: pkg.price,
      status: "pending",
      payment_status: "pending",
      client_phone: phone || null,
      address: address || null,
    });
    setSaving(false);
    if (error) { setErrorMsg(error.message); return; }
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold">Gersepa</Link>
          <Link to="/professionals"><Button size="sm" variant="ghost">Ver profissionais</Button></Link>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Agendamento rápido</h1>
          <p className="text-sm text-muted-foreground">Escolha data, cidade e pacote. Confirmamos com um profissional disponível.</p>
        </div>

        {!user ? (
          <div className="rounded-md border border-border p-4 text-sm">
            Para agendar, <Link to="/auth" className="text-primary underline">entre ou crie uma conta</Link>.
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-4 rounded-md border border-border p-6">
          <div className="space-y-1">
            <Label htmlFor="qb-city">Cidade</Label>
            <select
              id="qb-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Selecione...</option>
              {(citiesQ.data ?? []).map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="qb-date">Data</Label>
              <Input id="qb-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="qb-time">Hora</Label>
              <Input id="qb-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="qb-pkg">Pacote</Label>
            <select
              id="qb-pkg"
              value={pkgId}
              onChange={(e) => setPkgId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Selecione...</option>
              {(packagesQ.data ?? []).map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.duration_hours}h — R$ {Number(p.price).toFixed(0)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="qb-phone">Telefone</Label>
            <Input id="qb-phone" placeholder="(47) 90000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="qb-addr">Endereço</Label>
            <Input id="qb-addr" placeholder="Rua, número, bairro" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          {errorMsg ? <p className="text-sm text-destructive">{errorMsg}</p> : null}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Enviando..." : user ? "Confirmar agendamento" : "Entrar para agendar"}
          </Button>
        </form>
      </main>
    </div>
  );
}