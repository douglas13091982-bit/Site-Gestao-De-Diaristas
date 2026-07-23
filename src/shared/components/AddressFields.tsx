import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCEP, onlyDigits } from "@/shared/lib/format";
import { useViaCep } from "@/shared/hooks/use-viacep";

export type AddressValue = {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

export const emptyAddress = (): AddressValue => ({
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
});

type Props = {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  disabled?: boolean;
  /** Se true, ao encontrar o CEP também atualiza cidade/estado. */
  autofillCity?: boolean;
};

/** Bloco reutilizável de endereço com auto-preenchimento via ViaCEP. */
export function AddressFields({
  value,
  onChange,
  disabled,
  autofillCity = true,
}: Props) {
  const { lookup, loading } = useViaCep();
  const [notFound, setNotFound] = useState(false);

  function patch(partial: Partial<AddressValue>) {
    onChange({ ...value, ...partial });
  }

  async function handleCepBlur() {
    const digits = onlyDigits(value.cep);
    if (digits.length !== 8) return;
    const found = await lookup(digits);
    if (!found) {
      setNotFound(true);
      return;
    }
    setNotFound(false);
    patch({
      street: found.street || value.street,
      neighborhood: found.neighborhood || value.neighborhood,
      ...(autofillCity
        ? { city: found.city || value.city, state: found.state || value.state }
        : null),
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label htmlFor="cep">CEP</Label>
        <Input
          id="cep"
          value={formatCEP(value.cep)}
          onChange={(e) => patch({ cep: onlyDigits(e.target.value) })}
          onBlur={handleCepBlur}
          disabled={disabled}
          placeholder="00000-000"
          inputMode="numeric"
        />
        {loading ? (
          <p className="mt-1 text-xs text-muted-foreground">Buscando endereço…</p>
        ) : notFound ? (
          <p className="mt-1 text-xs text-destructive">CEP não encontrado.</p>
        ) : null}
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="street">Rua</Label>
        <Input
          id="street"
          value={value.street}
          onChange={(e) => patch({ street: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div>
        <Label htmlFor="number">Número</Label>
        <Input
          id="number"
          value={value.number}
          onChange={(e) => patch({ number: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div>
        <Label htmlFor="neighborhood">Bairro</Label>
        <Input
          id="neighborhood"
          value={value.neighborhood}
          onChange={(e) => patch({ neighborhood: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="complement">Complemento (opcional)</Label>
        <Input
          id="complement"
          value={value.complement}
          onChange={(e) => patch({ complement: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div>
        <Label htmlFor="city">Cidade</Label>
        <Input
          id="city"
          value={value.city}
          onChange={(e) => patch({ city: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div>
        <Label htmlFor="state">UF</Label>
        <Input
          id="state"
          value={value.state}
          maxLength={2}
          onChange={(e) => patch({ state: e.target.value.toUpperCase() })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}