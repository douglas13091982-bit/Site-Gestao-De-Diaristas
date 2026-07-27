import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Briefcase, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { PasswordChecklist } from "@/shared/components/PasswordChecklist";
import {
  createDefaultAvailability,
  type AvailabilityMap,
} from "@/shared/components/AvailabilityGrid";
import { TipoCard } from "@/features/auth/signup/components/TipoCard";
import { ClientFields } from "@/features/auth/signup/components/ClientFields";
import {
  ProfessionalFieldsTop,
  ProfessionalFieldsBottom,
} from "@/features/auth/signup/components/ProfessionalFields";
import {
  emptyClientFields,
  emptyProfessionalFields,
  normalizeTipo,
  type SignupTipo,
} from "@/features/auth/signup/types";
import { useCitiesQuery } from "@/features/auth/signup/queries";
import { validateSignup } from "@/features/auth/signup/validation";
import { submitSignup } from "@/features/auth/signup/service";

const searchSchema = z.object({
  tipo: fallback(z.string(), "").default(""),
});

type Tipo = SignupTipo | null;

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

  // Dados comuns
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);

  // Estados por tipo
  const [clientFields, setClientFields] = useState(emptyClientFields());
  const [professionalFields, setProfessionalFields] = useState(emptyProfessionalFields());
  const [availability, setAvailability] = useState<AvailabilityMap>(createDefaultAvailability());
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const cities = useCitiesQuery();

  function selectTipo(t: SignupTipo) {
    setTipo(t);
    nav({ to: "/cadastro", search: { tipo: t }, replace: true });
  }

  function patchClient(p: Partial<typeof clientFields>) {
    setClientFields((prev) => ({ ...prev, ...p }));
  }
  function patchProfessional(p: Partial<typeof professionalFields>) {
    setProfessionalFields((prev) => ({ ...prev, ...p }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tipo) return;

    const validationError = validateSignup({
      tipo,
      password,
      clientFields,
      professionalFields,
      availability,
      photoFile,
      email,
      phone,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setBusy(true);
    try {
      if (tipo === "client") {
        await submitSignup({
          tipo: "client",
          fullName, email, phone, password, city,
          fields: clientFields,
        });
      } else {
        await submitSignup({
          tipo: "professional",
          fullName, email, phone, password, city,
          fields: professionalFields,
          availability,
          photoFile: photoFile!,
        });
      }
      toast.success("Conta criada com sucesso!");
      nav({ to: tipo === "professional" ? "/onboarding" : "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setBusy(false);
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
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" required />
              </div>

              {tipo === "professional" && (
                <ProfessionalFieldsTop
                  value={professionalFields}
                  onChange={patchProfessional}
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone / WhatsApp</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(47) 99999-9999" required={tipo === "professional"} />
                </div>
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

              {tipo === "professional" && (
                <ProfessionalFieldsBottom
                  value={professionalFields}
                  onChange={patchProfessional}
                  photoFile={photoFile}
                  photoPreview={photoPreview}
                  onPhotoChange={(f, p) => { setPhotoFile(f); setPhotoPreview(p); }}
                  availability={availability}
                  onAvailabilityChange={setAvailability}
                />
              )}

              {tipo === "client" && (
                <ClientFields
                  value={clientFields}
                  onChange={patchClient}
                  onCityFromCep={setCity}
                />
              )}

              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Mín. 8 caract., com A-Z, a-z, número e símbolo"
                  aria-describedby="password-help"
                />
                <PasswordChecklist value={password} className="mt-1" />
              </div>

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Criando…" : "Criar Conta"}
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