import { useCallback, useState } from "react";
import { onlyDigits } from "@/shared/lib/format";

export type ViaCepAddress = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

/** Busca endereço no ViaCEP. Retorna null quando o CEP não existe. */
export function useViaCep() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (cep: string): Promise<ViaCepAddress | null> => {
    const digits = onlyDigits(cep);
    if (digits.length !== 8) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!res.ok) throw new Error("Falha ao consultar CEP");
      const data = (await res.json()) as ViaCepResponse;
      if (data.erro) return null;
      return {
        cep: data.cep ?? digits,
        street: data.logradouro ?? "",
        neighborhood: data.bairro ?? "",
        city: data.localidade ?? "",
        state: data.uf ?? "",
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao buscar CEP");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { lookup, loading, error };
}