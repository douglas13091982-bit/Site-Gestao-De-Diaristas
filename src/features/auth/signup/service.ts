import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-utils";
import type { AvailabilityMap } from "@/shared/components/AvailabilityGrid";
import type {
  ClientFieldsState,
  ProfessionalFieldsState,
  SignupTipo,
} from "./types";

export type CommonProfile = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  city: string;
};

type ClientPayload = CommonProfile & {
  tipo: "client";
  fields: ClientFieldsState;
};

type ProfessionalPayload = CommonProfile & {
  tipo: "professional";
  fields: ProfessionalFieldsState;
  availability: AvailabilityMap;
  photoFile: File;
};

export type SignupPayload = ClientPayload | ProfessionalPayload;

async function uploadProfessionalPhoto(userId: string, file: File): Promise<string | null> {
  const compressed = await compressImage(file, {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.82,
  });
  const path = `${userId}/profile.webp`;
  const up = await supabase.storage
    .from("professional-photos")
    .upload(path, compressed, { upsert: true, contentType: compressed.type });
  if (up.error) throw new Error("Falha ao enviar foto: " + up.error.message);
  const signed = await supabase.storage
    .from("professional-photos")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  return signed.data?.signedUrl ?? null;
}

function availabilityRows(userId: string, availability: AvailabilityMap) {
  return Array.from(availability.entries())
    .filter(([, d]) => d.on)
    .map(([idx, d]) => ({
      professional_id: userId,
      day_of_week: idx,
      start_time: d.start,
      end_time: d.end,
      is_available: true,
    }));
}

export async function submitSignup(payload: SignupPayload) {
  const redirectSuffix = payload.tipo === "professional" ? "onboarding" : "dashboard";
  const { data: signUp, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      emailRedirectTo: `${window.location.origin}/${redirectSuffix}`,
      data: { full_name: payload.fullName, phone: payload.phone, role: payload.tipo },
    },
  });
  if (error) throw error;
  const userId = signUp.user?.id;
  if (!userId) return;

  const base = { full_name: payload.fullName, phone: payload.phone, city: payload.city || null };

  if (payload.tipo === "client") {
    const f = payload.fields;
    await supabase.from("profiles").update({
      ...base,
      cpf: f.cpf,
      property_type: f.propertyType,
      address: f.address,
      address_number: f.addressNumber,
      address_neighborhood: f.neighborhood,
      address_complement: f.complement || null,
    }).eq("id", userId);
    return;
  }

  const f = payload.fields;
  const photoUrl = await uploadProfessionalPhoto(userId, payload.photoFile).catch((e) => {
    // preserva mensagem, mas não bloqueia o restante do fluxo (mesmo comportamento anterior)
    throw e;
  });

  await supabase.from("profiles").update({
    ...base,
    cpf: f.cpf,
    pix_key: f.pixKey,
    pix_key_type: f.pixKeyType,
    profession_category: f.category,
    specialties: f.specialties,
    regions: f.regions.join(","),
    experience: f.experience,
    bio: f.bio || null,
    profile_photo: photoUrl,
  }).eq("id", userId);

  const rows = availabilityRows(userId, payload.availability);
  if (rows.length > 0) {
    const av = await supabase.from("professional_availability").insert(rows);
    if (av.error) throw new Error("Não foi possível salvar a agenda: " + av.error.message);
  }
}