import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";

const statusLabel: Record<string, string> = {
  requested: "Solicitado", confirmed: "Confirmado", in_progress: "Em andamento",
  completed: "Concluído", reviewed: "Avaliado", cancelled: "Cancelado",
};

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({ meta: [
    { title: "Meus agendamentos — BabyClean" },
    { name: "description", content: "Histórico e status dos seus agendamentos." },
    { property: "og:title", content: "Agendamentos — BabyClean" },
    { property: "og:description", content: "Lista de agendamentos." },
  ] }),
  component: BookingsPage,
});

function BookingsPage() {
  const { user, roles } = useAuth();
  const qc = useQueryClient();
  const isWorker = roles.includes("worker");

  const q = useQuery({
    queryKey: ["bookings", user?.id, isWorker],
    enabled: !!user,
    queryFn: async () => {
      const col = isWorker ? "worker_id" : "client_id";
      const { data } = await supabase.from("bookings")
        .select("id, scheduled_at, status, total_price, address, notes, client_id, worker_id, duration_min")
        .eq(col, user!.id).order("scheduled_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  async function updateStatus(id: string, status: "confirmed" | "cancelled" | "in_progress" | "completed") {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    qc.invalidateQueries({ queryKey: ["bookings"] });
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Meus agendamentos</h1>
          {!isWorker && <Link to="/professionals"><Button>Novo agendamento</Button></Link>}
        </div>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          {q.data?.length ? q.data.map((b) => (
            <div key={b.id} className="p-4 flex flex-wrap gap-3 justify-between items-center">
              <div>
                <div className="font-semibold">{new Date(b.scheduled_at).toLocaleString("pt-BR")}</div>
                <div className="text-xs text-muted-foreground">{b.address ?? "—"} · {b.duration_min}min</div>
                {b.notes && <div className="text-xs text-muted-foreground mt-1">{b.notes}</div>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">R$ {Number(b.total_price).toFixed(2)}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">{statusLabel[b.status] ?? b.status}</span>
                {isWorker && b.status === "requested" && (
                  <>
                    <Button size="sm" onClick={() => updateStatus(b.id, "confirmed")}>Confirmar</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, "cancelled")}>Recusar</Button>
                  </>
                )}
                {isWorker && b.status === "confirmed" && (
                  <Button size="sm" onClick={() => updateStatus(b.id, "in_progress")}>Iniciar</Button>
                )}
                {isWorker && b.status === "in_progress" && (
                  <Button size="sm" onClick={() => updateStatus(b.id, "completed")}>Finalizar</Button>
                )}
                {!isWorker && ["requested","confirmed"].includes(b.status) && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, "cancelled")}>Cancelar</Button>
                )}
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-muted-foreground">Nenhum agendamento ainda.</div>
          )}
        </div>
      </div>
    </div>
  );
}
