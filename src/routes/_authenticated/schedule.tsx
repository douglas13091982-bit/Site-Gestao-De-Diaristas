import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

const DAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({ meta: [
    { title: "Minha agenda — BabyClean" },
    { name: "description", content: "Configure seus horários e serviços." },
    { property: "og:title", content: "Agenda — BabyClean" },
    { property: "og:description", content: "Gestão de agenda da diarista." },
  ] }),
  component: SchedulePage,
});

function SchedulePage() {
  const { user, roles } = useAuth();
  const qc = useQueryClient();
  const isWorker = roles.includes("worker");

  const services = useQuery({
    queryKey: ["my-services", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("services").select("*").eq("worker_id", user!.id).order("created_at")).data ?? [],
  });
  const avail = useQuery({
    queryKey: ["my-avail", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("availability").select("*").eq("worker_id", user!.id).order("day_of_week")).data ?? [],
  });

  const [svc, setSvc] = useState({ title: "", description: "", base_price: 150, duration_min: 240 });
  const [slot, setSlot] = useState({ day_of_week: 1, start_time: "08:00", end_time: "17:00" });

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("services").insert({ ...svc, worker_id: user.id });
    if (error) return toast.error(error.message);
    toast.success("Serviço criado");
    setSvc({ title: "", description: "", base_price: 150, duration_min: 240 });
    qc.invalidateQueries({ queryKey: ["my-services"] });
  }
  async function delService(id: string) {
    await supabase.from("services").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-services"] });
  }
  async function addSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("availability").insert({ ...slot, worker_id: user.id });
    if (error) return toast.error(error.message);
    toast.success("Horário adicionado");
    qc.invalidateQueries({ queryKey: ["my-avail"] });
  }
  async function delSlot(id: string) {
    await supabase.from("availability").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-avail"] });
  }

  if (!isWorker) {
    return (
      <div className="min-h-screen bg-secondary/40">
        <Header />
        <div className="max-w-2xl mx-auto p-10 text-center text-muted-foreground">
          Esta página é exclusiva para diaristas.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-5xl mx-auto px-6 py-10 grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-lg">Meus serviços</h2>
          <form onSubmit={addService} className="space-y-2">
            <Input placeholder="Título (ex: Faxina padrão)" value={svc.title} onChange={(e) => setSvc({ ...svc, title: e.target.value })} required />
            <Input placeholder="Descrição" value={svc.description} onChange={(e) => setSvc({ ...svc, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Preço R$</Label><Input type="number" min={0} step={5} value={svc.base_price} onChange={(e) => setSvc({ ...svc, base_price: Number(e.target.value) })} /></div>
              <div><Label className="text-xs">Duração (min)</Label><Input type="number" min={30} step={30} value={svc.duration_min} onChange={(e) => setSvc({ ...svc, duration_min: Number(e.target.value) })} /></div>
            </div>
            <Button type="submit" className="w-full">Adicionar</Button>
          </form>
          <ul className="divide-y divide-border">
            {services.data?.map((s) => (
              <li key={s.id} className="py-2 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm">{s.title}</div>
                  <div className="text-xs text-muted-foreground">R$ {Number(s.base_price).toFixed(2)} · {s.duration_min}min</div>
                </div>
                <button onClick={() => delService(s.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
            {!services.data?.length && <li className="text-sm text-muted-foreground py-3">Nenhum serviço.</li>}
          </ul>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-lg">Disponibilidade</h2>
          <form onSubmit={addSlot} className="space-y-2">
            <div><Label className="text-xs">Dia da semana</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3" value={slot.day_of_week} onChange={(e) => setSlot({ ...slot, day_of_week: Number(e.target.value) })}>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Início</Label><Input type="time" value={slot.start_time} onChange={(e) => setSlot({ ...slot, start_time: e.target.value })} /></div>
              <div><Label className="text-xs">Fim</Label><Input type="time" value={slot.end_time} onChange={(e) => setSlot({ ...slot, end_time: e.target.value })} /></div>
            </div>
            <Button type="submit" className="w-full">Adicionar horário</Button>
          </form>
          <ul className="divide-y divide-border">
            {avail.data?.map((a) => (
              <li key={a.id} className="py-2 flex justify-between items-center">
                <div className="text-sm"><b>{DAYS[a.day_of_week]}</b> · {a.start_time.slice(0,5)} — {a.end_time.slice(0,5)}</div>
                <button onClick={() => delSlot(a.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
            {!avail.data?.length && <li className="text-sm text-muted-foreground py-3">Sem horários.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
