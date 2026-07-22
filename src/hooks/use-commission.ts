import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Percentual de comissão da plataforma configurado em app_settings
 * (chave `commission_percentage`). Retorna número (ex.: 20).
 */
export function useCommissionPct() {
  const q = useQuery({
    queryKey: ["app-setting", "commission_percentage"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "commission_percentage")
        .maybeSingle();
      const n = Number(data?.setting_value ?? 20);
      return Number.isFinite(n) ? n : 20;
    },
  });
  return q.data ?? 20;
}

export function computePayout(total: number | null | undefined, pct: number) {
  const t = Number(total ?? 0);
  const p = Number.isFinite(pct) ? pct : 20;
  return Math.max(0, t * (1 - p / 100));
}