import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBranding() {
  const q = useQuery({
    queryKey: ["app-settings", "branding"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("setting_key,setting_value")
        .in("setting_key", ["logo_url", "site_name"]);
      const map = Object.fromEntries((data ?? []).map((r: any) => [r.setting_key, r.setting_value]));
      return {
        logoUrl: (map.logo_url as string) || "",
        siteName: (map.site_name as string) || "Gersepa Solutions",
      };
    },
  });
  return q.data ?? { logoUrl: "", siteName: "Gersepa Solutions" };
}