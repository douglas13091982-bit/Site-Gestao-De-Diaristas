import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/pro/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const profile = useQuery({
    queryKey: ["me-full", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });
  const cities = useQuery({
    queryKey: ["cities-enabled"],
    queryFn: async () => (await supabase.from("available_cities").select("slug,name,state").eq("is_enabled", true).order("name")).data ?? [],
  });

  const [f, setF] = useState<Record<string, string>>({});
  const [isAvailable, setIsAvailable] = useState(true);
  useEffect(() => {
    if (profile.data) {
      setF({
        full_name: profile.data.full_name ?? "",
        phone: profile.data.phone ?? "",
        bio: profile.data.bio ?? "",
        experience: profile.data.experience ?? "",
        hourly_rate: profile.data.hourly_rate?.toString() ?? "",
        specialties: (profile.data.specialties ?? []).join(", "),
        profile_photo: profile.data.profile_photo ?? "",
        city_slug: profile.data.city_slug ?? "",
        address: profile.data.address ?? "",
        pix_key: profile.data.pix_key ?? "",
        pix_key_type: profile.data.pix_key_type ?? "cpf",
      });
      setIsAvailable(profile.data.is_available ?? true);
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const cityName = cities.data?.find((c) => c.slug === f.city_slug)?.name ?? null;
      const { error } = await supabase.from("profiles").update({
        full_name: f.full_name, phone: f.phone, bio: f.bio, experience: f.experience,
        hourly_rate: Number(f.hourly_rate) || null,
        specialties: f.specialties.split(",").map((s) => s.trim()).filter(Boolean),
        profile_photo: f.profile_photo || null,
        city_slug: f.city_slug || null, city: cityName,
        address: f.address, pix_key: f.pix_key || null, pix_key_type: f.pix_key_type,
        is_available: isAvailable,
      }).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  if (profile.isLoading) return <p className="text-muted-foreground">Carregando…</p>;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="rounded-xl border bg-card p-5 flex items-center justify-between">
        <div>
          <div className="font-semibold">Status de atendimento</div>
          <p className="text-sm text-muted-foreground">Desative para pausar temporariamente o recebimento de leads.</p>
        </div>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" className="h-5 w-5" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
          <span className="text-sm">{isAvailable ? "Disponível" : "Pausada"}</span>
        </label>
      </div>

      <div className="rounded-xl border bg-card p-5 grid gap-4">
        <Row label="Nome"><Input value={f.full_name ?? ""} onChange={upd("full_name")} /></Row>
        <Row label="Telefone"><Input value={f.phone ?? ""} onChange={upd("phone")} /></Row>
        <Row label="Foto (URL)"><Input value={f.profile_photo ?? ""} onChange={upd("profile_photo")} /></Row>
        <Row label="Bio"><Textarea rows={3} value={f.bio ?? ""} onChange={upd("bio")} /></Row>
        <Row label="Experiência"><Textarea rows={2} value={f.experience ?? ""} onChange={upd("experience")} /></Row>
        <div className="grid grid-cols-2 gap-3">
          <Row label="Valor/hora (R$)"><Input type="number" value={f.hourly_rate ?? ""} onChange={upd("hourly_rate")} /></Row>
          <Row label="Cidade">
            <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={f.city_slug ?? ""} onChange={upd("city_slug")}>
              <option value="">—</option>
              {cities.data?.map((c) => <option key={c.slug} value={c.slug}>{c.name} — {c.state}</option>)}
            </select>
          </Row>
        </div>
        <Row label="Especialidades (separadas por vírgula)"><Input value={f.specialties ?? ""} onChange={upd("specialties")} /></Row>
        <Row label="Endereço"><Input value={f.address ?? ""} onChange={upd("address")} /></Row>
        <div className="grid grid-cols-2 gap-3">
          <Row label="Tipo chave PIX">
            <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={f.pix_key_type ?? "cpf"} onChange={upd("pix_key_type")}>
              <option value="cpf">CPF</option><option value="email">E-mail</option><option value="phone">Telefone</option><option value="random">Aleatória</option>
            </select>
          </Row>
          <Row label="Chave PIX"><Input value={f.pix_key ?? ""} onChange={upd("pix_key")} /></Row>
        </div>
        <div className="pt-2 flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar alterações"}</Button>
        </div>
        {save.isError && <p className="text-sm text-destructive">{(save.error as Error).message}</p>}
        {save.isSuccess && <p className="text-sm text-emerald-600">Perfil atualizado.</p>}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}