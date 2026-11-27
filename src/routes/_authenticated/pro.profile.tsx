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
import { useCategoriesQuery, useCategorySpecialtiesQuery } from "@/features/auth/signup/queries";
import { ChipToggle, toggleInArray } from "@/features/auth/signup/components/ChipToggle";
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

type City = { id: number; nome: string };
type CityDraft = { state: string; text: string; city: City | null };

function normalizeCity(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

function citySlug(name: string) {
  return normalizeCity(name).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const profile = useQuery({
    queryKey: ["me-full", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });
  const rpc = supabase.rpc.bind(supabase) as unknown as (name: string, args?: Record<string, unknown>) => Promise<{data: unknown; error: {message: string} | null}>;
  const whatsapp = useQuery({
    queryKey: ["whatsapp-manual", user?.id, profile.data?.phone],
    enabled: !!user && !!profile.data,
    queryFn: async () => {
      const [status, config] = await Promise.all([rpc("whatsapp_manual_status", {p_id: user!.id}), rpc("whatsapp_manual_config")]);
      if (status.error || config.error) throw new Error(status.error?.message ?? config.error?.message);
      return {verified: status.data === true, phone: config.data as string | null};
    },
  });
  const [code, setCode] = useState("");
  useEffect(() => { setCode(""); }, [profile.data?.phone]);
  const requestCode = useMutation({
    mutationFn: async () => {
      const result = await rpc("whatsapp_manual_request");
      if (result.error) throw new Error(result.error.message);
      return String(result.data);
    },
    onSuccess: setCode,
    onError: (e: Error) => toast.error(e.message),
  });
  const states = useQuery({
    queryKey: ["ibge-states"],
    queryFn: async () => {
      const response = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome");
      if (!response.ok) throw new Error("Não foi possível carregar os estados.");
      return await response.json() as Array<{ id: number; sigla: string; nome: string }>;
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
  const [cityDraft, setCityDraft] = useState<CityDraft | null>(null);
  const savedCitySlug = profile.data?.city_slug;
  const savedCity = useQuery({
    queryKey: ["profile-city-state", savedCitySlug],
    enabled: !!savedCitySlug,
    queryFn: async () => {
      const { data, error } = await supabase.from("available_cities")
        .select("name, state").eq("slug", savedCitySlug!).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const registeredCity = profile.data?.city ?? "";
  const savedState = savedCity.data && normalizeCity(savedCity.data.name) === normalizeCity(registeredCity)
    ? savedCity.data.state
    : null;
  const selectedState = cityDraft?.state ?? savedState ?? "";
  const citySearch = cityDraft?.text ?? registeredCity;
  const [cityOpen, setCityOpen] = useState(false);
  const ibgeCities = useQuery({
    queryKey: ["ibge-cities", selectedState],
    enabled: !!selectedState,
    queryFn: async () => {
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(selectedState)}/municipios?orderBy=nome`);
      if (!response.ok) throw new Error("Não foi possível carregar as cidades.");
      return await response.json() as City[];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
  const filteredCities = (ibgeCities.data ?? []).filter((city) => normalizeCity(city.nome).includes(normalizeCity(citySearch))).slice(0, 50);


  const [f, setF] = useState<Record<string, string>>({});
  const categories = useCategoriesQuery();
  const category = categories.data?.find(c => c.name === f.profession_category);
  const specialties = useCategorySpecialtiesQuery(category?.id);
  const selectedSpecialties = (f.specialties ?? "").split(",").map(s => s.trim()).filter(Boolean);
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
        profession_category: profile.data.profession_category ?? "",
        specialties: (profile.data.specialties ?? []).join(", "),
        profile_photo: profile.data.profile_photo ?? "",
        pix_key: profile.data.pix_key ?? "",
        pix_key_type: profile.data.pix_key_type ?? "cpf",
      });
      setIsAvailable(profile.data.is_available ?? true);
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) return;
      let cityFields: { city?: string; city_slug?: string } = {};
      if (cityDraft) {
        const { state, city } = cityDraft;
        if (!state || !city) throw new Error("Selecione um estado e uma cidade da lista.");
        const slug = citySlug(city.nome);
        const { error: cityError } = await supabase.rpc("register_professional_city", {
          p_name: city.nome, p_state: state, p_slug: slug,
        });
        if (cityError) throw new Error(cityError.message);
        cityFields = { city: city.nome, city_slug: slug };
      }

      const { error } = await supabase.from("profiles").update({
        full_name: sanitizeText(f.full_name, { maxLength: 120, collapseWhitespace: true }),
        phone: sanitizeDigits(f.phone, 15),
        bio: sanitizeTextOrNull(f.bio, { maxLength: 1000 }),
        experience: sanitizeText(f.experience, { maxLength: 500 }),
        profession_category: sanitizeText(f.profession_category ?? "", { maxLength: 60 }),
        specialties: sanitizeStringArray(
          f.specialties.split(","),
          { maxLength: 60, maxItems: 30 },
        ),
        profile_photo: f.profile_photo || null,
        ...cityFields,
        pix_key: sanitizeTextOrNull(f.pix_key, { maxLength: 120, collapseWhitespace: true }),
        pix_key_type: sanitizeText(f.pix_key_type, { maxLength: 20 }),
        is_available: isAvailable,
      }).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries();
      setCityDraft(null);
      setCityOpen(false);
    },
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
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <h2 className="font-semibold">Confirmação do WhatsApp</h2>
        {whatsapp.isError ? <p className="text-sm text-destructive">Não foi possível consultar a verificação.</p> : whatsapp.data?.verified ? <p className="text-sm font-semibold text-emerald-700">WhatsApp verificado</p> : <p className="text-sm text-muted-foreground">Salve seu telefone, gere o código e envie pelo próprio WhatsApp cadastrado. Aguarde a confirmação da empresa.</p>}
        {!whatsapp.data?.verified && whatsapp.data?.phone && <>
          <Button type="button" disabled={requestCode.isPending} onClick={() => requestCode.mutate()}>Gerar código</Button>
          {code && <div className="space-y-2"><p className="text-2xl font-bold tracking-widest">{code}</p><p className="text-xs">Válido por até 24 horas.</p><a className="inline-block rounded-md bg-emerald-600 px-4 py-2 text-white" href={`https://wa.me/${whatsapp.data.phone}?text=${encodeURIComponent("Meu código de confirmação Gersepa: " + code)}`} target="_blank" rel="noopener noreferrer">Enviar código pelo WhatsApp</a></div>}
        </>}
        {!whatsapp.data?.phone && !whatsapp.isLoading && !whatsapp.isError && <p className="text-sm">A empresa ainda não configurou o número de recebimento.</p>}
        <Button type="button" variant="outline" size="sm" onClick={() => whatsapp.refetch()}>Atualizar status</Button>
      </div>
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
        <Row label="Experiência"><Input placeholder="Ex.: 3 anos" value={f.experience ?? ""} onChange={upd("experience")} /></Row>
        <Row label="Categoria profissional">
          <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={f.profession_category ?? ""} disabled={categories.isLoading || save.isPending} onChange={e=>setF(p=>({...p,profession_category:e.target.value,specialties:""}))}>
            <option value="">Selecione uma categoria</option>
            {f.profession_category && !category && <option value={f.profession_category}>{f.profession_category}</option>}
            {categories.data?.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          {categories.isError && <p className="text-sm text-destructive">Não foi possível carregar as categorias.</p>}
        </Row>
        <Row label="Especialidades">
          <p className="text-xs text-muted-foreground">Toque nas especialidades que você oferece. Pode selecionar várias.</p>
          {!category && <p className="text-sm text-muted-foreground">Selecione sua categoria profissional.</p>}
          {category && specialties.isLoading && <p className="text-sm">Carregando especialidades…</p>}
          {specialties.isError && <p className="text-sm text-destructive">Não foi possível carregar as especialidades.</p>}
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set([...(specialties.data ?? []).map(s=>s.name),...selectedSpecialties])).map(name=><ChipToggle key={name} active={selectedSpecialties.includes(name)} onClick={()=>setF(p=>({...p,specialties:toggleInArray((p.specialties ?? "").split(",").map(s=>s.trim()).filter(Boolean),name).join(", ")}))}>{name}</ChipToggle>)}
          </div>
        </Row>
        <Row label="Estado (UF)">
          <select className="w-full h-10 rounded-md border bg-background px-3 text-sm"
            value={selectedState} disabled={save.isPending} onChange={(e) => {
              setCityDraft({ state: e.target.value, text: "", city: null });
              setCityOpen(false);
            }}>
            <option value="">Selecione o estado</option>
            {states.data?.map((state) => <option key={state.id} value={state.sigla}>{state.nome} — {state.sigla}</option>)}
          </select>
          {states.isError && <p className="text-sm text-destructive">Falha ao carregar estados. Tente atualizar a página.</p>}
        </Row>
        <Row label="Cidade">
          <div className="relative">
            <Input role="combobox" aria-expanded={cityOpen} aria-autocomplete="list"
              placeholder={!selectedState ? "Selecione primeiro o estado" : ibgeCities.isLoading ? "Carregando cidades…" : "Digite o nome da cidade"}
              disabled={!selectedState || ibgeCities.isLoading || save.isPending} value={citySearch}
              onFocus={() => setCityOpen(true)}
              onChange={(e) => { setCityDraft({ state: selectedState, text: e.target.value, city: null }); setCityOpen(true); }} />
            {cityOpen && selectedState && !ibgeCities.isLoading && (
              <div role="listbox" className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-md border bg-background shadow-lg">
                {filteredCities.map((city) => (
                  <button key={city.id} type="button" role="option" aria-selected={cityDraft ? cityDraft.city?.id === city.id : normalizeCity(registeredCity) === normalizeCity(city.nome)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    disabled={save.isPending}
                    onClick={() => { setCityDraft({ state: selectedState, text: city.nome, city }); setCityOpen(false); }}>
                    {city.nome}
                  </button>
                ))}
                {!filteredCities.length && <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma cidade encontrada.</p>}
              </div>
            )}
          </div>
          {ibgeCities.isError && <p className="text-sm text-destructive">Falha ao carregar cidades deste estado.</p>}
          {cityDraft && !cityDraft.city && <p className="text-xs text-muted-foreground">Escolha uma cidade nas sugestões para confirmar.</p>}
          {cityDraft && registeredCity && <Button type="button" variant="ghost" size="sm" disabled={save.isPending} onClick={() => { setCityDraft(null); setCityOpen(false); }}>Manter cidade atual</Button>}
        </Row>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 space-y-1">
          <div className="text-sm font-semibold text-emerald-800">Dados para recebimento</div>
          <p className="text-xs text-emerald-700/80">Informe sua chave PIX para receber os pagamentos dos serviços realizados.</p>
        </div>
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
