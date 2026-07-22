import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Briefcase, User as UserIcon, MapPin, Home, Building2, Store, Building } from "lucide-react";
import { Camera, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  tipo: fallback(z.string(), "").default(""),
});

type Tipo = "client" | "professional" | null;

function normalizeTipo(v: string): Tipo {
  if (v === "client" || v === "cliente") return "client";
  if (v === "professional" || v === "profissional" || v === "worker") return "professional";
  return null;
}

export const Route = createFileRoute("/cadastro")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Criar conta — Gersepa Solutions" },
      { name: "description", content: "Cadastre-se como cliente ou profissional na Gersepa Solutions." },
      { property: "og:title", content: "Criar conta — Gersepa Solutions" },
      { property: "og:description", content: "Escolha seu tipo de conta e cadastre-se em segundos." },
    ],
  }),
  component: CadastroPage,
});

function CadastroPage() {
  const { tipo: tipoParam } = Route.useSearch();
  const nav = useNavigate();
  const [tipo, setTipo] = useState<Tipo>(normalizeTipo(tipoParam));

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [city, setCity] = useState("");
  const [accept, setAccept] = useState(false);

  // Client-only
  const [propertyType, setPropertyType] = useState<string>("");
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [complement, setComplement] = useState("");

  // Professional-only
  const [cpf, setCpf] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("cpf");
  const [category, setCategory] = useState("");
  const [experience, setExperience] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);

  // Foto de perfil
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Disponibilidade semanal
  const DAYS: { idx: number; label: string }[] = [
    { idx: 0, label: "Domingo" },
    { idx: 1, label: "Segunda-feira" },
    { idx: 2, label: "Terça-feira" },
    { idx: 3, label: "Quarta-feira" },
    { idx: 4, label: "Quinta-feira" },
    { idx: 5, label: "Sexta-feira" },
    { idx: 6, label: "Sábado" },
  ];
  const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
  const defaultAvail = () => {
    const m = new Map<number, { on: boolean; start: string; end: string }>();
    DAYS.forEach((d) => m.set(d.idx, { on: d.idx >= 1 && d.idx <= 5, start: "08:00", end: "17:00" }));
    return m;
  };
  const [availability, setAvailability] = useState<Map<number, { on: boolean; start: string; end: string }>>(defaultAvail());
  function updateAvail(idx: number, patch: Partial<{ on: boolean; start: string; end: string }>) {
    setAvailability((prev) => {
      const next = new Map(prev);
      const cur = next.get(idx)!;
      next.set(idx, { ...cur, ...patch });
      return next;
    });
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("A foto deve ter no máximo 5MB."); return; }
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) { toast.error("Envie JPEG, PNG, WebP ou GIF."); return; }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  }

  const cities = useQuery({
    queryKey: ["cadastro-cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("available_cities")
        .select("name,state")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const categories = useQuery({
    queryKey: ["cadastro-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profession_categories")
        .select("id,name")
        .eq("is_enabled", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedCat = categories.data?.find((c) => c.name === category);
  const catSpecialties = useQuery({
    queryKey: ["cadastro-specialties", selectedCat?.id],
    enabled: !!selectedCat?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_specialties")
        .select("name")
        .eq("category_id", selectedCat!.id)
        .eq("is_enabled", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  function toggle(arr: string[], v: string, set: (x: string[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  async function lookupCep(raw: string) {
    const clean = raw.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    setCepError(null);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await r.json();
      if (data?.erro) { setCepError("CEP não encontrado"); return; }
      if (data?.logradouro) setAddress(data.logradouro);
      if (data?.bairro) setNeighborhood(data.bairro);
      if (data?.localidade) setCity(data.localidade);
      if (data?.complemento && !complement) setComplement(data.complemento);
    } catch {
      setCepError("Não foi possível buscar o CEP");
    } finally {
      setCepLoading(false);
    }
  }

  function selectTipo(t: Exclude<Tipo, null>) {
    setTipo(t);
    nav({ to: "/cadastro", search: { tipo: t }, replace: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tipo) return;
    if (!accept) {
      toast.error("Você precisa aceitar os Termos de Uso.");
      return;
    }
    if (tipo === "client" && !propertyType) {
      toast.error("Selecione o tipo de imóvel.");
      return;
    }
    if (tipo === "client" && cpf.replace(/\D/g, "").length !== 11) {
      toast.error("Informe um CPF válido (11 dígitos).");
      return;
    }
    if (tipo === "professional" && (!category || regions.length === 0)) {
      toast.error("Selecione a categoria e ao menos uma região atendida.");
      return;
    }
    if (tipo === "professional" && !photoFile) {
      toast.error("Envie uma foto de perfil.");
      return;
    }
    if (tipo === "professional") {
      const anyOn = Array.from(availability.values()).some((d) => d.on);
      if (!anyOn) { toast.error("Selecione ao menos um dia de disponibilidade."); return; }
      for (const [idx, d] of availability.entries()) {
        if (d.on && d.start >= d.end) { toast.error(`Horário inválido em ${DAYS[idx].label}.`); return; }
      }
    }
    setBusy(true);
    try {
      const { data: signUp, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/${tipo === "professional" ? "onboarding" : "dashboard"}`,
          data: { full_name: fullName, phone, role: tipo },
        },
      });
      if (error) throw error;
      const userId = signUp.user?.id;
      if (userId) {
        const base = { full_name: fullName, phone, city: city || null };
        if (tipo === "client") {
          await supabase.from("profiles").update({
            ...base,
            cpf,
            property_type: propertyType,
            address,
            address_number: addressNumber,
            address_neighborhood: neighborhood,
            address_complement: complement || null,
          }).eq("id", userId);
        } else {
          // Upload da foto (bucket privado -> signed URL 10 anos)
          let photoUrl: string | null = null;
          if (photoFile) {
            const ext = photoFile.name.split(".").pop() || "jpg";
            const path = `${userId}/profile.${ext}`;
            const up = await supabase.storage.from("professional-photos").upload(path, photoFile, { upsert: true, contentType: photoFile.type });
            if (up.error) {
              toast.error("Falha ao enviar foto: " + up.error.message);
            } else {
              const signed = await supabase.storage.from("professional-photos").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
              photoUrl = signed.data?.signedUrl ?? null;
            }
          }

          await supabase.from("profiles").update({
            ...base,
            cpf,
            pix_key: pixKey,
            pix_key_type: pixKeyType,
            profession_category: category,
            specialties,
            regions: regions.join(","),
            experience,
            bio: bio || null,
            profile_photo: photoUrl,
          }).eq("id", userId);

          // Disponibilidade semanal
          const rows = Array.from(availability.entries())
            .filter(([, d]) => d.on)
            .map(([idx, d]) => ({ professional_id: userId, day_of_week: idx, start_time: d.start, end_time: d.end, is_available: true }));
          if (rows.length > 0) {
            const av = await supabase.from("professional_availability").insert(rows);
            if (av.error) toast.error("Não foi possível salvar a agenda: " + av.error.message);
          }
        }
      }
      toast.success("Conta criada com sucesso!");
      nav({ to: tipo === "professional" ? "/onboarding" : "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    try {
      const { lovable } = await import("@/integrations/lovable");
      await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro Google");
    }
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-card border border-border rounded-2xl shadow-sm p-8 space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Criar Conta</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Cadastre-se para começar a usar a plataforma
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TipoCard
              icon={<UserIcon className="w-8 h-8" />}
              title="Sou Cliente"
              subtitle="Quero contratar serviços"
              tone="client"
              active={tipo === "client"}
              onClick={() => selectTipo("client")}
            />
            <TipoCard
              icon={<Briefcase className="w-8 h-8" />}
              title="Sou Profissional"
              subtitle="Quero oferecer serviços"
              tone="professional"
              active={tipo === "professional"}
              onClick={() => selectTipo("professional")}
            />
          </div>

          {!tipo && (
            <p className="text-center text-sm text-muted-foreground">
              Selecione uma opção acima para continuar
            </p>
          )}

          {tipo && (
            <form onSubmit={submit} className="space-y-4 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>

              {tipo === "professional" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input id="cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="category">Categoria Profissional</Label>
                      <select
                        id="category"
                        value={category}
                        onChange={(e) => { setCategory(e.target.value); setSpecialties([]); }}
                        required
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="">Selecione…</option>
                        {categories.data?.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="pixtype">Tipo da chave PIX</Label>
                      <select
                        id="pixtype"
                        value={pixKeyType}
                        onChange={(e) => setPixKeyType(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="cpf">CPF</option>
                        <option value="phone">Telefone</option>
                        <option value="email">E-mail</option>
                        <option value="random">Chave aleatória</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pix">Chave PIX para recebimentos</Label>
                      <Input id="pix" value={pixKey} onChange={(e) => setPixKey(e.target.value)} required />
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone / WhatsApp</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(47) 99999-9999" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city">Cidade</Label>
                <select
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Selecione sua cidade</option>
                  {cities.data?.map((c) => (
                    <option key={`${c.name}-${c.state}`} value={c.name}>
                      {c.name} — {c.state}
                    </option>
                  ))}
                </select>
              </div>

              {tipo === "client" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="client-cpf">CPF</Label>
                    <Input
                      id="client-cpf"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      required
                    />
                    <p className="text-xs text-muted-foreground">Necessário para validar o pagamento via Mercado Pago.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de imóvel</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { v: "casa", l: "Casa", i: <Home className="w-4 h-4" /> },
                        { v: "apartamento", l: "Apartamento", i: <Building2 className="w-4 h-4" /> },
                        { v: "sala_comercial", l: "Sala Comercial", i: <Store className="w-4 h-4" /> },
                        { v: "condominio", l: "Condomínio", i: <Building className="w-4 h-4" /> },
                      ].map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => setPropertyType(o.v)}
                          className={`flex items-center gap-2 h-10 px-3 rounded-md border text-sm transition ${
                            propertyType === o.v
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-input hover:bg-secondary"
                          }`}
                        >
                          {o.i}
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="addr">Endereço (Rua/Avenida)</Label>
                    <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ex: Rua das Flores" required />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="num">Número</Label>
                      <Input id="num" value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} placeholder="123" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bairro">Bairro</Label>
                      <Input id="bairro" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Centro" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="comp">Complemento (opcional)</Label>
                    <Input id="comp" value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Apartamento, bloco, etc." />
                  </div>
                </>
              )}

              {tipo === "professional" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="exp">Experiência</Label>
                    <Input id="exp" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="Ex: 5 anos" />
                  </div>

                  {selectedCat && (
                    <div className="space-y-2">
                      <Label>Especialidades</Label>
                      {catSpecialties.data && catSpecialties.data.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {catSpecialties.data.map((s) => {
                            const on = specialties.includes(s.name);
                            return (
                              <button
                                key={s.name}
                                type="button"
                                onClick={() => toggle(specialties, s.name, setSpecialties)}
                                className={`px-3 py-1.5 rounded-full text-xs border transition ${
                                  on ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-secondary"
                                }`}
                              >
                                {s.name}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Nenhuma especialidade cadastrada para esta categoria.</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Regiões atendidas</Label>
                    <div className="flex flex-wrap gap-2">
                      {["Centro", "Zona Norte", "Zona Sul", "Zona Leste", "Zona Oeste"].map((r) => {
                        const on = regions.includes(r);
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => toggle(regions, r, setRegions)}
                            className={`px-3 py-1.5 rounded-full text-xs border transition inline-flex items-center gap-1 ${
                              on ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-secondary"
                            }`}
                          >
                            <MapPin className="w-3 h-3" />
                            {r}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bio">Sobre você (opcional)</Label>
                    <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Fale um pouco sobre sua experiência e diferenciais." />
                  </div>

                  {/* Foto de Perfil */}
                  <div className="space-y-2">
                    <Label>Foto de Perfil <span className="text-destructive">*</span></Label>
                    {photoPreview ? (
                      <div className="flex items-center gap-3">
                        <img src={photoPreview} alt="Prévia" className="w-24 h-24 rounded-full object-cover border" />
                        <button
                          type="button"
                          onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                          className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-destructive"
                        >
                          <X className="w-4 h-4" /> Remover
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="cursor-pointer border-2 border-dashed border-input rounded-lg p-4 flex flex-col items-center justify-center text-sm text-muted-foreground hover:bg-secondary transition">
                          <ImagePlus className="w-6 h-6 mb-1" />
                          Escolher da galeria
                          <input type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
                        </label>
                        <label className="cursor-pointer border-2 border-dashed border-primary/40 bg-primary/5 rounded-lg p-4 flex flex-col items-center justify-center text-sm text-primary hover:bg-primary/10 transition">
                          <Camera className="w-6 h-6 mb-1" />
                          Tirar foto agora
                          <input type="file" accept="image/*" capture="user" className="hidden" onChange={onPhotoChange} />
                        </label>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">JPEG, PNG, WebP ou GIF (máx. 5MB)</p>
                  </div>

                  {/* Disponibilidade Semanal */}
                  <div className="space-y-2">
                    <Label>Disponibilidade Semanal</Label>
                    <p className="text-xs text-muted-foreground">Selecione os dias e horários que você trabalha</p>
                    <div className="space-y-2">
                      {DAYS.map((d) => {
                        const row = availability.get(d.idx)!;
                        return (
                          <div
                            key={d.idx}
                            className={`flex flex-wrap items-center gap-2 rounded-lg border p-3 transition ${
                              row.on ? "border-primary/40 bg-primary/5" : "border-input bg-background"
                            }`}
                          >
                            <label className="inline-flex items-center gap-2 min-w-[140px] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={row.on}
                                onChange={(e) => updateAvail(d.idx, { on: e.target.checked })}
                                className="h-4 w-4 rounded border-input accent-primary"
                              />
                              <span className="text-sm font-medium">{d.label}</span>
                            </label>
                            <div className="flex items-center gap-2 ml-auto">
                              <select
                                disabled={!row.on}
                                value={row.start}
                                onChange={(e) => updateAvail(d.idx, { start: e.target.value })}
                                className="h-9 px-2 rounded-md border border-input bg-background text-sm disabled:opacity-50"
                              >
                                {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                              </select>
                              <span className="text-sm text-muted-foreground">até</span>
                              <select
                                disabled={!row.on}
                                value={row.end}
                                onChange={(e) => updateAvail(d.idx, { end: e.target.value })}
                                className="h-9 px-2 rounded-md border border-input bg-background text-sm disabled:opacity-50"
                              >
                                {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={accept}
                  onChange={(e) => setAccept(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-input accent-primary"
                />
                <span>
                  Li e aceito os <a className="text-primary underline" href="/termos" target="_blank" rel="noreferrer">Termos de Uso</a> e a{" "}
                  <a className="text-primary underline" href="/privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a>.
                </span>
              </label>

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Criando…" : "Criar Conta"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center"><span className="bg-card px-3 text-xs uppercase text-muted-foreground">ou</span></div>
              </div>

              <Button type="button" variant="outline" className="w-full" onClick={google}>
                Continuar com Google
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link to="/auth" className="text-primary font-semibold hover:underline">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function TipoCard({
  icon,
  title,
  subtitle,
  tone,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone: "client" | "professional";
  active: boolean;
  onClick: () => void;
}) {
  const activeClasses =
    tone === "client"
      ? "bg-primary text-primary-foreground border-primary"
      : "bg-orange-500 text-white border-orange-500";
  const idleClasses =
    tone === "client"
      ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
      : "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border-2 p-6 text-center transition flex flex-col items-center gap-2 ${
        active ? activeClasses : idleClasses
      }`}
    >
      {icon}
      <div className="font-bold text-lg mt-1">{title}</div>
      <div className={`text-sm ${active ? "opacity-90" : "opacity-80"}`}>{subtitle}</div>
    </button>
  );
}