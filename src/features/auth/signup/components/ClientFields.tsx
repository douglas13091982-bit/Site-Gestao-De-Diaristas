import { Home, Building2, Store, Building } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCEP, onlyDigits } from "@/shared/lib/format";
import { useViaCep } from "@/shared/hooks/use-viacep";
import { useState } from "react";
import { ChipToggle } from "./ChipToggle";
import { PROPERTY_TYPES, type ClientFieldsState } from "../types";

const PROPERTY_ICONS: Record<string, JSX.Element> = {
  casa: <Home className="w-4 h-4" />,
  apartamento: <Building2 className="w-4 h-4" />,
  sala_comercial: <Store className="w-4 h-4" />,
  condominio: <Building className="w-4 h-4" />,
};

type Props = {
  value: ClientFieldsState;
  onChange: (patch: Partial<ClientFieldsState>) => void;
  onCityFromCep: (city: string) => void;
};

export function ClientFields({ value, onChange, onCityFromCep }: Props) {
  const { lookup, loading } = useViaCep();
  const [cepError, setCepError] = useState<string | null>(null);

  async function handleLookup(raw: string) {
    const digits = onlyDigits(raw);
    if (digits.length !== 8) return;
    setCepError(null);
    const found = await lookup(digits);
    if (!found) {
      setCepError("CEP não encontrado");
      return;
    }
    onChange({
      address: found.street || value.address,
      neighborhood: found.neighborhood || value.neighborhood,
      complement: value.complement || "",
    });
    if (found.city) onCityFromCep(found.city);
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="client-cpf">CPF</Label>
        <Input
          id="client-cpf"
          value={value.cpf}
          onChange={(e) => onChange({ cpf: e.target.value })}
          placeholder="000.000.000-00"
          inputMode="numeric"
          required
        />
        <p className="text-xs text-muted-foreground">Necessário para validar o pagamento via Mercado Pago.</p>
      </div>

      <div className="space-y-2">
        <Label>Tipo de imóvel</Label>
        <div className="grid grid-cols-2 gap-2">
          {PROPERTY_TYPES.map((o) => (
            <ChipToggle
              key={o.value}
              active={value.propertyType === o.value}
              onClick={() => onChange({ propertyType: o.value })}
              size="md"
            >
              {PROPERTY_ICONS[o.value]}
              {o.label}
            </ChipToggle>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cep">CEP</Label>
        <div className="relative">
          <Input
            id="cep"
            value={formatCEP(value.cep)}
            onChange={(e) => {
              const digits = onlyDigits(e.target.value).slice(0, 8);
              onChange({ cep: digits });
              if (digits.length === 8) handleLookup(digits);
            }}
            onBlur={() => handleLookup(value.cep)}
            placeholder="00000-000"
            inputMode="numeric"
            maxLength={9}
            required
          />
          {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">buscando…</span>}
        </div>
        {cepError ? (
          <p className="text-xs text-destructive">{cepError}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Preenchemos rua, bairro e cidade automaticamente.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="addr">Endereço (Rua/Avenida)</Label>
        <Input id="addr" value={value.address} onChange={(e) => onChange({ address: e.target.value })} placeholder="Ex: Rua das Flores" required />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="num">Número</Label>
          <Input id="num" value={value.addressNumber} onChange={(e) => onChange({ addressNumber: e.target.value })} placeholder="123" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bairro">Bairro</Label>
          <Input id="bairro" value={value.neighborhood} onChange={(e) => onChange({ neighborhood: e.target.value })} placeholder="Centro" required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="comp">Complemento (opcional)</Label>
        <Input id="comp" value={value.complement} onChange={(e) => onChange({ complement: e.target.value })} placeholder="Apartamento, bloco, etc." />
      </div>
    </>
  );
}