import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useRef, useState } from "react";
import { Camera, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-utils";
import {
  sanitizeText,
  sanitizeTextOrNull,
  sanitizeDigits,
  sanitizeStringArray,
} from "@/shared/lib/sanitize";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (profile.data) {
      setF({
        full_name: profile.data.full_name ?? "",
        phone: profile.data.phone ?? "",
        bio: profile.data.bio ?? "",
        experience: profile.data.experience ?? "",
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
        full_name: sanitizeText(f.full_name, { maxLength: 120, collapseWhitespace: true }),
        phone: sanitizeDigits(f.phone, 15),
        bio: sanitizeTextOrNull(f.bio, { maxLength: 1000 }),
        experience: sanitizeText(f.experience, { maxLength: 500 }),
        specialties: sanitizeStringArray(
          f.specialties.split(","),
          { maxLength: 60, maxItems: 30 },
        ),
        profile_photo: f.profile_photo || null,
        city_slug: sanitizeTextOrNull(f.city_slug, { maxLength: 80 }),
        city: sanitizeTextOrNull(cityName, { maxLength: 80, collapseWhitespace: true }),
        address: sanitizeText(f.address, { maxLength: 200, collapseWhitespace: true }),
        pix_key: sanitizeTextOrNull(f.pix_key, { maxLength: 120, collapseWhitespace: true }),
        pix_key_type: sanitizeText(f.pix_key_type, { maxLength: 20 }),
        is_available: isAvailable,
      }).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const uploadPhoto = async (input: File) => {
    if (!user) return;
    if (input.size > 10 * 1024 * 1024) {
      toast.error("Foto muito grande. Máximo 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const file = await compressImage(input, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 });
      const path = `${user.id}/avatar-${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage.from("professional-photos").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage.from("professional-photos").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (sErr) throw sErr;
      const url = signed.signedUrl;
      const { error: updErr } = await supabase.from("profiles").update({ profile_photo: url }).eq("id", user.id);
      if (updErr) throw updErr;
      setF((p) => ({ ...p, profile_photo: url }));
      qc.invalidateQueries();
      toast.success("Foto atualizada!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

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
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 rounded-full overflow-hidden bg-muted border shrink-0">
            {f.profile_photo ? (
              <img src={f.profile_photo} alt="Foto" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-2xl font-semibold text-muted-foreground">
                {(f.full_name || "?").charAt(0).toUpperCase()}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold mb-2">Foto de perfil</div>
            <div className="flex flex-wrap gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1.5" /> Enviar foto
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => cameraInputRef.current?.click()}>
                <Camera className="h-4 w-4 mr-1.5" /> Tirar foto
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">JPG ou PNG, até 5 MB.</p>
          </div>
        </div>
        <Row label="Nome"><Input value={f.full_name ?? ""} onChange={upd("full_name")} /></Row>
        <Row label="Telefone"><Input value={f.phone ?? ""} onChange={upd("phone")} /></Row>
        <Row label="Bio"><Textarea rows={3} value={f.bio ?? ""} onChange={upd("bio")} /></Row>
        <Row label="Experiência"><Textarea rows={2} value={f.experience ?? ""} onChange={upd("experience")} /></Row>
        <Row label="Cidade">
          <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={f.city_slug ?? ""} onChange={upd("city_slug")}>
            <option value="">—</option>
            {cities.data?.map((c) => <option key={c.slug} value={c.slug}>{c.name} — {c.state}</option>)}
          </select>
        </Row>
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