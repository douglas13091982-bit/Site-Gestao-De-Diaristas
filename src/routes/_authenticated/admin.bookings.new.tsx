import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/bookings/new")({
  component: NewBooking,
});

const TIMES = ["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"];

function NewBooking() {
  const nav = useNavigate();

  const pros = useQuery({
    queryKey: ["admin-pros-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles")
        .select("id,full_name,city").eq("is_professional", true).order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const packages = useQuery({
    queryKey: ["pricing-packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pricing_packages")
        .select("id,duration_hours,price,start_time,is_enabled")
        .eq("is_enabled", true).order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [f, setF] = useState({
    client_name: "", client_phone: "", client_email: "",
    address: "", property_type: "casa", rooms: "2", bathrooms: "1",
    professional_id: "", package_id: "",
    booking_date: "", start_time: "09:00",
    city: "", payment_method: "cash", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e.target.value });

  const selectedPkg = useMemo(
    () => packages.data?.find(p => String(p.id) === f.package_id),
    [packages.data, f.package_id]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.client_name.trim() || !f.client_phone.trim() || !f.address.trim() ||
        !f.professional_id || !f.package_id || !f.booking_date || !f.city.trim()) {
      toast.error("Preencha os campos obrigatórios"); return;
    }
    setSaving(true);
    const { error } = await supabase.from("bookings").insert({
      professional_id: f.professional_id,
      booking_type: "selected",
      service_type: "diarista",
      property_type: f.property_type,
      booking_date: f.booking_date,
      start_time: f.start_time,
      duration_hours: selectedPkg?.duration_hours ?? null,
      rooms: Number(f.rooms), bathrooms: Number(f.bathrooms),
      address: `${f.address} — ${f.client_name} (${f.client_phone})${f.client_email ? " " + f.client_email : ""}`,
      city: f.city, city_slug: f.city.toLowerCase().replace(/\s+/g,"-"),
      notes: f.notes || null,
      status: "confirmed",
      total_price: selectedPkg?.price ?? null,
      payment_method: f.payment_method,
      client_email: f.client_email || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Agendamento criado");
    nav({ to: "/admin/bookings" });
  };

  return (
    <div className="p-8">
      <AdminPageHeader title="Novo Agendamento Manual" subtitle="Criar agendamento para clientes que solicitam via WhatsApp" />
      <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          {/* Cliente */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">Dados do Cliente</h3>
            <div className="space-y-4">
              <Field label="Nome do Cliente" required>
                <input required placeholder="Nome completo" value={f.client_name} onChange={set("client_name")} className={inp} maxLength={100} />
              </Field>
              <Field label="Telefone (WhatsApp)" required>
                <input required placeholder="(47) 99999-9999" value={f.client_phone} onChange={set("client_phone")} className={inp} maxLength={20} />
              </Field>
              <Field label="Email (opcional)">
                <input type="email" placeholder="email@exemplo.com" value={f.client_email} onChange={set("client_email")} className={inp} maxLength={120} />
              </Field>
              <Field label="Endereço Completo" required>
                <textarea required placeholder="Rua, número, bairro, cidade" value={f.address} onChange={set("address")} className={inp + " min-h-[70px]"} maxLength={300} />
              </Field>
              <Field label="Tipo de Imóvel" required>
                <select value={f.property_type} onChange={set("property_type")} className={inp}>
                  <option value="casa">Casa</option>
                  <option value="apartamento">Apartamento</option>
                  <option value="comercial">Comercial</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Quartos">
                  <select value={f.rooms} onChange={set("rooms")} className={inp}>
                    {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
                <Field label="Banheiros">
                  <select value={f.bathrooms} onChange={set("bathrooms")} className={inp}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          </div>

          {/* Serviço */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">Dados do Serviço</h3>
            <div className="space-y-4">
              <Field label="Profissional" required>
                <select required value={f.professional_id} onChange={set("professional_id")} className={inp}>
                  <option value="">Selecione um profissional</option>
                  {pros.data?.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}{p.city ? ` — ${p.city}` : ""}</option>
                  ))}
                </select>
              </Field>
              <Field label="Pacote de Horas" required>
                <select required value={f.package_id} onChange={set("package_id")} className={inp}>
                  <option value="">Selecione um pacote</option>
                  {packages.data?.map(p => (
                    <option key={p.id} value={p.id}>{p.duration_hours}h — R$ {Number(p.price).toFixed(2)}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Data" required>
                  <input required type="date" value={f.booking_date} onChange={set("booking_date")} className={inp} />
                </Field>
                <Field label="Horário" required>
                  <select value={f.start_time} onChange={set("start_time")} className={inp}>
                    {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Cidade" required>
                <input required placeholder="Ex: Joinville" value={f.city} onChange={set("city")} className={inp} maxLength={80} />
              </Field>
              <Field label="Forma de Pagamento" required>
                <div className="flex items-center gap-6 pt-1">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="pm" value="cash" checked={f.payment_method==="cash"} onChange={set("payment_method")} />
                    Dinheiro
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="pm" value="pix" checked={f.payment_method==="pix"} onChange={set("payment_method")} />
                    PIX
                  </label>
                </div>
              </Field>
              <Field label="Observações">
                <textarea placeholder="Instruções especiais..." value={f.notes} onChange={set("notes")} className={inp + " min-h-[70px]"} maxLength={500} />
              </Field>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <button type="submit" disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60">
            <Plus className="h-5 w-5" /> {saving ? "Criando..." : "Criar Agendamento"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inp = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-700 block mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}