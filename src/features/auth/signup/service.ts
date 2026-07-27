import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-utils";
import {
  sanitizeText,
  sanitizeTextOrNull,
  sanitizeEmail,
  sanitizeDigits,
  sanitizeStringArray,
} from "@/shared/lib/sanitize";
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

function detectPixKeyType(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "random";
  if (v.includes("@")) return "email";
  const digits = v.replace(/\D/g, "");
  if (digits.length === 11 && digits === v.replace(/[.\-\s]/g, "")) return "cpf";
  if (digits.length >= 10 && digits.length <= 13) return "phone";
  return "random";
}

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
  const redirectSuffix = payload.tipo === "professional" ? "pro" : "dashboard";
  const fullName = sanitizeText(payload.fullName, { maxLength: 120, collapseWhitespace: true });
  const email = sanitizeEmail(payload.email);
  const phone = sanitizeDigits(payload.phone, 15);
  const city = sanitizeTextOrNull(payload.city, { maxLength: 80, collapseWhitespace: true });
  if (!fullName) throw new Error("Informe um nome válido.");
  if (!email) throw new Error("Informe um e-mail válido.");
  const { data: signUp, error } = await supabase.auth.signUp({
    email,
    password: payload.password,
    options: {
      emailRedirectTo: `${window.location.origin}/${redirectSuffix}`,
      data: { full_name: fullName, phone, role: payload.tipo },
    },
  });
  if (error) throw error;
  const userId = signUp.user?.id;
  if (!userId) return;

  const base = { full_name: fullName, phone, city };

  if (payload.tipo === "client") {
    const f = payload.fields;
    const { error: upErr } = await supabase.from("profiles").update({
      ...base,
      cpf: sanitizeDigits(f.cpf, 11),
      property_type: sanitizeText(f.propertyType, { maxLength: 40 }),
      address: sanitizeText(f.address, { maxLength: 200, collapseWhitespace: true }),
      address_number: sanitizeText(f.addressNumber, { maxLength: 20 }),
      address_neighborhood: sanitizeText(f.neighborhood, { maxLength: 120, collapseWhitespace: true }),
      address_complement: sanitizeTextOrNull(f.complement, { maxLength: 120 }),
    }).eq("id", userId);
    if (upErr) throw new Error("Falha ao salvar perfil: " + upErr.message);
    return;
  }

  const f = payload.fields;
  const photoUrl = await uploadProfessionalPhoto(userId, payload.photoFile).catch((e) => {
    // preserva mensagem, mas não bloqueia o restante do fluxo (mesmo comportamento anterior)
    throw e;
  });

  const { error: upProErr } = await supabase.from("profiles").update({
    ...base,
    cpf: sanitizeDigits(f.cpf, 11),
    pix_key: sanitizeText(f.pixKey, { maxLength: 120, collapseWhitespace: true }),
    pix_key_type: detectPixKeyType(f.pixKey),
    profession_category: sanitizeText(f.category, { maxLength: 60 }),
    specialties: sanitizeStringArray(f.specialties, { maxLength: 60, maxItems: 30 }),
    regions: sanitizeStringArray(f.regions, { maxLength: 60, maxItems: 30 }).join(","),
    experience: sanitizeText(f.experience, { maxLength: 60 }),
    bio: sanitizeTextOrNull(f.bio, { maxLength: 1000 }),
    profile_photo: photoUrl,
  }).eq("id", userId);
  if (upProErr) throw new Error("Falha ao salvar perfil profissional: " + upProErr.message);

  const rows = availabilityRows(userId, payload.availability);
  if (rows.length > 0) {
    const av = await supabase.from("professional_availability").insert(rows);
    if (av.error) throw new Error("Não foi possível salvar a agenda: " + av.error.message);
  }
}