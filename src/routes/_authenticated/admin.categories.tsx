import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import {
  Sparkles, Wrench, Hammer, Layers, Brush, Home, Building2, Utensils,
  Shirt, ChefHat, Coffee, Plus, Eye, EyeOff, Trash2, Loader2,
} from "lucide-react";

const ICONS: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  Sparkles: { label: "Sparkles (Diarista)", Icon: Sparkles },
  Wrench: { label: "Wrench (Reparos)", Icon: Wrench },
  Hammer: { label: "Hammer (Marido de aluguel)", Icon: Hammer },
  Brush: { label: "Brush (Pintura)", Icon: Brush },
  Home: { label: "Home (Residencial)", Icon: Home },
  Building2: { label: "Building (Comercial)", Icon: Building2 },
  Utensils: { label: "Utensils (Cozinha)", Icon: Utensils },
  ChefHat: { label: "ChefHat (Cozinheira)", Icon: ChefHat },
  Coffee: { label: "Coffee (Copeira)", Icon: Coffee },
  Shirt: { label: "Shirt (Passadeira)", Icon: Shirt },
  Layers: { label: "Layers (Outros)", Icon: Layers },
};

function IconOf({ name, className }: { name: string | null; className?: string }) {
  const Comp = (name && ICONS[name]?.Icon) || Layers;
  return <Comp className={className} />;
}

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
  const [form, setForm] = useState({ name: "", icon: "Layers", description: "" });
  const [openSpecs, setOpenSpecs] = useState<number | null>(null);

  const add = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nome obrigatório");
      const { error } = await supabase.from("profession_categories").insert({
        name: form.name.trim(),
        slug: slugify(form.name),
        icon: form.icon || "Layers",
        description: form.description.trim() || null,
        is_enabled: true,
        display_order: 999,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Categoria criada"); setForm({ name: "", icon: "Layers", description: "" }); qc.invalidateQueries({ queryKey: ["admin-cats"] }); },
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

  const cats = q.data ?? [];
  const activeCount = cats.filter((c) => c.is_enabled).length;

  return (
    <div className="p-4 md:p-8">
      <AdminPageHeader title="Categorias de Profissões" subtitle="Crie, ative ou desative categorias de profissionais na plataforma" />

      {/* New category form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4">Nova Categoria</h3>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Nome *</label>
            <Input placeholder="Ex: Babá" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={60} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Ícone</label>
            <select
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
            >
              {Object.entries(ICONS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className="text-xs font-medium text-slate-700 mb-1 block">Descrição</label>
          <Input placeholder="Descrição breve da categoria" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength={140} />
        </div>
        <Button onClick={() => add.mutate()} disabled={add.isPending} className="bg-emerald-500 hover:bg-emerald-600 text-white">
          {add.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Criar Categoria
        </Button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
          {activeCount} de {cats.length} categorias ativas
        </div>
        <div className="divide-y divide-slate-100">
          {q.isLoading && <div className="p-6 text-center text-slate-500">Carregando...</div>}
          {cats.map((c) => (
            <div key={c.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                  <IconOf name={c.icon} className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900">{c.name}</div>
                  <div className="text-sm text-slate-500 truncate">{c.description || "—"}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                  {c.is_enabled ? "Ativo" : "Inativo"}
                </span>
                <button
                  onClick={() => toggle.mutate(c)}
                  title={c.is_enabled ? "Desativar" : "Ativar"}
                  className={`w-9 h-9 rounded-md flex items-center justify-center ${c.is_enabled ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-slate-200 text-slate-600 hover:bg-slate-300"}`}
                >
                  {c.is_enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => confirm(`Remover categoria "${c.name}"?`) && remove.mutate(c.id)}
                  title="Excluir"
                  className="w-9 h-9 rounded-md bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setOpenSpecs(openSpecs === c.id ? null : c.id)}
                className="mt-3 ml-16 text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5"
              >
                <Layers className="w-4 h-4" />
                Gerenciar Especialidades
              </button>
              {openSpecs === c.id && <SpecialtiesEditor categoryId={c.id} />}
            </div>
          ))}
          {!q.isLoading && cats.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">Nenhuma categoria cadastrada.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SpecialtiesEditor({ categoryId }: { categoryId: number }) {
  const qc = useQueryClient();
  const key = ["admin-cat-specs", categoryId];
  const q = useQuery({
    queryKey: key,
    queryFn: async () =>
      (await supabase.from("category_specialties").select("*").eq("category_id", categoryId).order("display_order")).data ?? [],
  });
  const [name, setName] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Nome obrigatório");
      const nextOrder = ((q.data ?? []).reduce((m, s) => Math.max(m, s.display_order ?? 0), 0) || 0) + 1;
      const { error } = await supabase.from("category_specialties").insert({
        category_id: categoryId, name: name.trim(), display_order: nextOrder, is_enabled: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { setName(""); qc.invalidateQueries({ queryKey: key }); toast.success("Especialidade adicionada"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: async (row: { id: number; is_enabled: boolean }) => {
      const { error } = await supabase.from("category_specialties").update({ is_enabled: !row.is_enabled }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  const remove = useMutation({
    mutationFn: async (id: number) => { const { error } = await supabase.from("category_specialties").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Removida"); },
  });

  return (
    <div className="mt-3 ml-16 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Nova especialidade (ex: Limpeza Residencial)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add.mutate(); }}
        />
        <Button onClick={() => add.mutate()} disabled={add.isPending} className="bg-emerald-500 hover:bg-emerald-600 text-white shrink-0">
          <Plus className="w-4 h-4 mr-1" /> Adicionar
        </Button>
      </div>
      {(q.data ?? []).length === 0 ? (
        <div className="text-sm text-slate-500 py-2">Nenhuma especialidade cadastrada.</div>
      ) : (
        <ul className="space-y-1.5">
          {q.data?.map((s) => (
            <li key={s.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-2">
              <span className="flex-1 text-sm text-slate-800">{s.name}</span>
              <button
                onClick={() => toggle.mutate(s)}
                className={`text-xs px-2 py-0.5 rounded-full ${s.is_enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
              >
                {s.is_enabled ? "Ativa" : "Inativa"}
              </button>
              <button
                onClick={() => confirm(`Remover "${s.name}"?`) && remove.mutate(s.id)}
                className="w-7 h-7 rounded bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}