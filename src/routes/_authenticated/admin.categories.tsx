import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({ meta: [{ title: "Categorias — Admin Gersepa" }] }),
  component: AdminCategories,
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function AdminCategories() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-cats"],
    queryFn: async () => (await supabase.from("profession_categories").select("*").order("display_order")).data ?? [],
  });
  const [form, setForm] = useState({ name: "", icon: "🧹", min: "", max: "" });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nome obrigatório");
      const { error } = await supabase.from("profession_categories").insert({
        name: form.name.trim(), slug: slugify(form.name), icon: form.icon || "🧹",
        min_hourly_rate: form.min ? Number(form.min) : null, max_hourly_rate: form.max ? Number(form.max) : null,
        is_enabled: true, display_order: 999,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Categoria adicionada"); setForm({ name: "", icon: "🧹", min: "", max: "" }); qc.invalidateQueries({ queryKey: ["admin-cats"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: async (row: { id: number; is_enabled: boolean }) => {
      const { error } = await supabase.from("profession_categories").update({ is_enabled: !row.is_enabled }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-cats"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: number) => { const { error } = await supabase.from("profession_categories").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removida"); qc.invalidateQueries({ queryKey: ["admin-cats"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8">
      <AdminPageHeader title="Categorias de serviço" subtitle="Faxineira, passadeira, cozinheira, etc." />
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 grid sm:grid-cols-[80px_1fr_100px_100px_auto] gap-3">
        <Input placeholder="Ícone" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} maxLength={4} />
        <Input placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={60} />
        <Input placeholder="R$/h min" type="number" value={form.min} onChange={e => setForm({ ...form, min: e.target.value })} />
        <Input placeholder="R$/h max" type="number" value={form.max} onChange={e => setForm({ ...form, max: e.target.value })} />
        <Button onClick={() => add.mutate()} disabled={add.isPending}>Adicionar</Button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-2">Categoria</th><th className="text-left px-4 py-2">Slug</th><th className="text-left px-4 py-2">Faixa</th><th className="text-left px-4 py-2">Status</th><th></th></tr></thead>
          <tbody>
            {q.data?.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{c.icon} {c.name}</td>
                <td className="px-4 py-2 text-slate-500">{c.slug}</td>
                <td className="px-4 py-2 text-slate-600">{c.min_hourly_rate ? `R$ ${Number(c.min_hourly_rate).toFixed(0)}–${Number(c.max_hourly_rate ?? c.min_hourly_rate).toFixed(0)}` : "—"}</td>
                <td className="px-4 py-2"><button onClick={() => toggle.mutate(c)} className={`text-xs px-2 py-0.5 rounded-full ${c.is_enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{c.is_enabled ? "Ativa" : "Inativa"}</button></td>
                <td className="px-4 py-2 text-right"><button onClick={() => confirm("Remover?") && remove.mutate(c.id)} className="text-xs text-red-600 hover:underline">Excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}