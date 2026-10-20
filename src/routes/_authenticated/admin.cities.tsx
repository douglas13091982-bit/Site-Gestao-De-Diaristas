import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/cities")({
  head: () => ({ meta: [{ title: "Cidades — Admin Gersepa" }] }),
  component: AdminCities,
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function AdminCities() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-cities"],
    queryFn: async () => (await supabase.from("available_cities").select("*").order("display_order").order("name")).data ?? [],
  });
  const auto = useQuery({ queryKey: ["city-auto-enable"], queryFn: async () => { const { data, error } = await supabase.from("app_settings").select("setting_value").eq("setting_key", "auto_enable_city_first_professional").maybeSingle(); if (error) throw error; return data?.setting_value === "true"; } });
  const setAuto = useMutation({ mutationFn: async (enabled: boolean) => { const { error } = await supabase.from("app_settings").upsert({ setting_key: "auto_enable_city_first_professional", setting_value: String(enabled), setting_group: "cities", setting_type: "boolean", setting_label: "Liberar cidade após aprovação da primeira profissional", is_public: false }, { onConflict: "setting_key" }); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["city-auto-enable"] }); toast.success("Configuração atualizada"); }, onError: (e: Error) => toast.error(e.message) });
  const [name, setName] = useState(""); const [state, setState] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !state.trim()) throw new Error("Preencha nome e estado");
      const { error } = await supabase.from("available_cities").insert({ name: name.trim(), slug: slugify(name), state: state.trim().toUpperCase(), is_enabled: true, display_order: 999 });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cidade adicionada"); setName(""); setState(""); qc.invalidateQueries({ queryKey: ["admin-cities"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: async (row: { id: number; is_enabled: boolean }) => {
      const { error } = await supabase.from("available_cities").update({ is_enabled: !row.is_enabled }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-cities"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: number) => { const { error } = await supabase.from("available_cities").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removida"); qc.invalidateQueries({ queryKey: ["admin-cities"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-8">
      <AdminPageHeader title="Cidades atendidas" subtitle="Gerencie as cidades exibidas publicamente." />
      <label className="bg-white rounded-xl border border-slate-200 p-5 mb-6 flex items-start gap-3 cursor-pointer"><input type="checkbox" className="mt-1 h-5 w-5" checked={auto.data ?? false} disabled={auto.isLoading || setAuto.isPending} onChange={(e) => setAuto.mutate(e.target.checked)} /><span><strong className="block">Liberar cidade automaticamente após aprovação da primeira profissional</strong><span className="text-sm text-slate-600">A cidade será liberada para clientes e outras diaristas quando a primeira profissional cadastrada nela for verificada. Cidades bloqueadas manualmente permanecem bloqueadas.</span></span></label>
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 grid sm:grid-cols-[1fr_120px_auto] gap-3">
        <Input placeholder="Nome da cidade" value={name} onChange={e => setName(e.target.value)} maxLength={80} />
        <Input placeholder="UF" value={state} onChange={e => setState(e.target.value)} maxLength={2} />
        <Button onClick={() => add.mutate()} disabled={add.isPending}>Adicionar</Button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr><th className="text-left px-4 py-2">Cidade</th><th className="text-left px-4 py-2">UF</th><th className="text-left px-4 py-2">Slug</th><th className="text-left px-4 py-2">Status</th><th></th></tr>
          </thead>
          <tbody>
            {q.data?.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{c.name}</td>
                <td className="px-4 py-2">{c.state}</td>
                <td className="px-4 py-2 text-slate-500">{c.slug}</td>
                <td className="px-4 py-2">
                  <button onClick={() => toggle.mutate(c)} className={`text-xs px-2 py-0.5 rounded-full ${c.is_enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{c.is_enabled ? "Ativa" : "Inativa"}</button>
                </td>
                <td className="px-4 py-2 text-right"><button onClick={() => confirm("Remover?") && remove.mutate(c.id)} className="text-xs text-red-600 hover:underline">Excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}