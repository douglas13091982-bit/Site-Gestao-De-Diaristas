import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "./admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => (await supabase.from("app_settings").select("*").order("setting_group").order("setting_key")).data ?? [],
  });
  const [values, setValues] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.data) {
      const map: Record<string,string> = {};
      q.data.forEach(s => { map[s.setting_key] = s.setting_value ?? ""; });
      setValues(map);
    }
  }, [q.data]);

  const save = async () => {
    setSaving(true);
    for (const s of q.data ?? []) {
      await supabase.from("app_settings").update({ setting_value: values[s.setting_key] ?? "" }).eq("setting_key", s.setting_key);
    }
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["admin-settings"] });
  };

  const groups = Array.from(new Set((q.data ?? []).map(s => s.setting_group)));

  return (
    <div className="p-8 max-w-3xl">
      <AdminPageHeader title="Configurações" subtitle="Ajustes gerais da plataforma" actions={<Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>} />
      <div className="space-y-6">
        {groups.map(g => (
          <div key={g} className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-900 mb-4 capitalize">{g}</h2>
            <div className="space-y-3">
              {(q.data ?? []).filter(s => s.setting_group === g).map(s => (
                <label key={s.setting_key} className="block">
                  <span className="text-xs font-semibold text-slate-600 block mb-1">{s.setting_label ?? s.setting_key}</span>
                  <Input value={values[s.setting_key] ?? ""} onChange={e => setValues({...values, [s.setting_key]: e.target.value})} />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}