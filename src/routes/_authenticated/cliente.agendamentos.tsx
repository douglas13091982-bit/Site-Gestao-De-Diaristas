import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Calendar, MapPin, Phone, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cliente/agendamentos")({
  head: () => ({ meta: [{ title: "Meus agendamentos — Gersepa" }, { name: "description", content: "Acompanhe seus serviços." }] }),
  component: ClienteAgendamentos,
});

const STATUS: Record<string, { label: string; color: string }> = {
  pending:     { label: "Aguardando", color: "bg-amber-100 text-amber-700" },
  confirmed:   { label: "Confirmado", color: "bg-emerald-100 text-emerald-700" },
  in_progress: { label: "Em andamento", color: "bg-blue-100 text-blue-700" },
  awaiting_client_confirmation: { label: "Confirme a conclusão", color: "bg-amber-100 text-amber-800" },
  completed:   { label: "Concluído", color: "bg-slate-200 text-slate-700" },
  cancelled:   { label: "Cancelado", color: "bg-red-100 text-red-700" },
};

function ClienteAgendamentos() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    enabled: !!user,
    queryKey: ["cliente-bookings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("bookings")
        .select("id, service_type, city, address, booking_date, start_time, duration_hours, status, total_price, professional_id, payment_status, guest_token")
        .or(`client_id.eq.${user!.id},client_email.eq.${user!.email}`)
        .order("booking_date", { ascending: false }).limit(100);
      const rows = data ?? [];
      const ids = Array.from(new Set(rows.map((r) => r.professional_id).filter(Boolean))) as string[];
      let pros: Record<string, { full_name: string | null; phone: string | null; profile_photo: string | null }> = {};
      if (ids.length) {
        const { data: p } = await supabase.from("profiles").select("id,full_name,phone,profile_photo").in("id", ids);
        pros = Object.fromEntries((p ?? []).map((x) => [x.id, x]));
      }
      const bookingIds = rows.map((r) => r.id);
      let reviews: Record<string, { rating: number; comment: string | null }> = {};
      if (bookingIds.length) {
        const { data: rv } = await supabase.from("reviews").select("booking_id, rating, comment").in("booking_id", bookingIds);
        reviews = Object.fromEntries((rv ?? []).map((x) => [x.booking_id, { rating: x.rating, comment: x.comment }]));
      }
      return rows.map((r) => ({
        ...r,
        professional: r.professional_id ? pros[r.professional_id] : null,
        review: reviews[r.id] ?? null,
      }));
    },
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Meus agendamentos</h2>
          <p className="text-sm text-muted-foreground">Acompanhe todos os serviços solicitados.</p>
        </div>
        <Link to="/cliente" className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shrink-0">Novo</Link>
      </div>

      {q.isLoading && <div className="text-muted-foreground">Carregando…</div>}
      {!q.isLoading && !q.data?.length && (
        <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
          Você ainda não tem agendamentos.
          <div className="mt-4"><Link to="/cliente" className="text-primary font-semibold">Criar o primeiro</Link></div>
        </div>
      )}

      <ul className="space-y-3">
        {q.data?.map((b) => {
          const s = STATUS[b.status] ?? { label: b.status, color: "bg-slate-100 text-slate-700" };
          const contactUnlocked = b.professional && (b.status === "confirmed" || b.status === "in_progress" || b.status === "completed");
          const needsConfirm = b.status === "awaiting_client_confirmation";
          return (
            <li key={b.id} className="bg-card border border-border rounded-2xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold capitalize">{b.service_type ?? "Serviço"}</div>
                  <div className="text-xs text-muted-foreground mt-1 space-y-1">
                    <div className="flex items-center gap-1"><Calendar className="h-3 w-3 shrink-0" />{b.booking_date} · {b.start_time?.slice(0,5)} · {b.duration_hours}h</div>
                    <div className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{b.city} — {b.address}</span></div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${s.color}`}>{s.label}</span>
                  {b.total_price != null && <div className="mt-2 font-bold text-primary">R$ {Number(b.total_price).toFixed(2)}</div>}
                  {b.payment_status && b.payment_status !== "approved" && b.payment_status !== "paid" && (
                    <div className="text-[10px] text-muted-foreground mt-1 uppercase">Pgto: {b.payment_status}</div>
                  )}
                </div>
              </div>

              {contactUnlocked && (
                <div className="mt-3 pt-3 border-t border-border flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-muted border shrink-0">
                    {b.professional?.profile_photo ? (
                      <img src={b.professional.profile_photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-sm font-semibold text-muted-foreground">
                        {(b.professional?.full_name || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">Sua diarista</div>
                    <div className="font-semibold truncate text-sm">{b.professional?.full_name ?? "—"}</div>
                  </div>
                  {b.professional?.phone && (
                    <a href={`https://wa.me/55${String(b.professional.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 h-9 px-3 rounded-md bg-emerald-600 text-white text-xs font-semibold shrink-0">
                      <Phone className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  )}
                </div>
              )}

              {b.status === "pending" && b.payment_status === "pending" && (
                <div className="mt-3">
                  <Link to="/agendamento-sucesso/$id" params={{ id: String(b.id) }} search={{ t: b.guest_token ?? "" }} className="text-xs font-semibold text-primary">Concluir pagamento →</Link>
                </div>
              )}

              {needsConfirm && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">A diarista marcou o serviço como concluído. Confirme para liberar o pagamento a ela.</p>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Confirmar que o serviço foi concluído? O pagamento será liberado para a diarista.")) return;
                      const { error } = await supabase.from("bookings").update({ status: "completed" }).eq("id", b.id);
                      if (error) return toast.error("Erro ao confirmar: " + error.message);
                      toast.success("Serviço confirmado. Obrigado!");
                      qc.invalidateQueries({ queryKey: ["cliente-bookings"] });
                    }}
                    className="h-9 px-4 rounded-md bg-emerald-600 text-white text-xs font-semibold"
                  >
                    Confirmar conclusão
                  </button>
                </div>
              )}

              {b.status === "completed" && b.professional_id && (
                <div className="mt-3 pt-3 border-t border-border">
                  {b.review ? (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Sua avaliação</div>
                      <StarsDisplay value={Number(b.review.rating)} />
                      {b.review.comment && <p className="text-xs text-muted-foreground mt-1 italic">"{b.review.comment}"</p>}
                    </div>
                  ) : (
                    <RateForm bookingId={b.id} professionalId={b.professional_id} onDone={() => qc.invalidateQueries({ queryKey: ["cliente-bookings"] })} />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StarsDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-4 w-4 ${n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
      ))}
    </div>
  );
}

function RateForm({ bookingId, professionalId, onDone }: { bookingId: number; professionalId: string; onDone: () => void }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!user || rating < 1) return;
    setSaving(true);
    const { error } = await supabase.from("reviews").insert({
      booking_id: bookingId, professional_id: professionalId,
      client_id: user.id, client_email: user.email ?? null,
      rating, comment: comment.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error("Erro ao avaliar: " + error.message);
    toast.success("Avaliação enviada!");
    onDone();
  }

  return (
    <div>
      <div className="text-xs font-semibold mb-2">Avaliar diarista</div>
      <div className="flex items-center gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} className="p-0.5">
            <Star className={`h-6 w-6 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={300} rows={2}
        placeholder="Deixe um comentário (opcional)"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      <button type="button" onClick={submit} disabled={saving || rating < 1}
        className="mt-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-60">
        {saving ? "Enviando…" : "Enviar avaliação"}
      </button>
    </div>
  );
}