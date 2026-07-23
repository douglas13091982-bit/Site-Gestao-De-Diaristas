import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "branding-cache-v1";
const DEFAULT = { logoUrl: "", siteName: "Gersepa Solutions" };

function readCache() {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

export function useBranding() {
  const q = useQuery({
    queryKey: ["app-settings", "branding"],
    staleTime: 5 * 60 * 1000,
    initialData: readCache,
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("setting_key,setting_value")
        .in("setting_key", ["logo_url", "site_name"]);
      const map = Object.fromEntries((data ?? []).map((r: any) => [r.setting_key, r.setting_value]));
      const result = {
        logoUrl: (map.logo_url as string) || "",
        siteName: (map.site_name as string) || "Gersepa Solutions",
      };
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(CACHE_KEY, JSON.stringify(result));
        }
      } catch {
        // ignore quota errors
      }
      return result;
    },
  });
  return q.data ?? DEFAULT;
}