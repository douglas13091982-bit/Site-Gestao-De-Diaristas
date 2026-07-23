import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCitiesQuery() {
  return useQuery({
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
}

export function useCategoriesQuery() {
  return useQuery({
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
}

export function useCategorySpecialtiesQuery(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["cadastro-specialties", categoryId],
    enabled: !!categoryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_specialties")
        .select("name")
        .eq("category_id", categoryId!)
        .eq("is_enabled", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}