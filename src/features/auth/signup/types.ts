export type SignupTipo = "client" | "professional";

export function normalizeTipo(v: string): SignupTipo | null {
  if (v === "client" || v === "cliente") return "client";
  if (v === "professional" || v === "profissional" || v === "worker") return "professional";
  return null;
}

export type ClientFieldsState = {
  propertyType: string;
  cpf: string;
  cep: string;
  address: string;
  addressNumber: string;
  neighborhood: string;
  complement: string;
};

export const emptyClientFields = (): ClientFieldsState => ({
  propertyType: "",
  cpf: "",
  cep: "",
  address: "",
  addressNumber: "",
  neighborhood: "",
  complement: "",
});

export type ProfessionalFieldsState = {
  cpf: string;
  pixKey: string;
  pixKeyType: string;
  category: string;
  experience: string;
  bio: string;
  specialties: string[];
  regions: string[];
};

export const emptyProfessionalFields = (): ProfessionalFieldsState => ({
  cpf: "",
  pixKey: "",
  pixKeyType: "cpf",
  category: "",
  experience: "",
  bio: "",
  specialties: [],
  regions: [],
});

export const PROPERTY_TYPES = [
  { value: "casa", label: "Casa" },
  { value: "apartamento", label: "Apartamento" },
  { value: "sala_comercial", label: "Comercial" },
  { value: "condominio", label: "Condomínio" },
] as const;

export const PROFESSIONAL_REGIONS = [
  "Centro",
  "Zona Norte",
  "Zona Sul",
  "Zona Leste",
  "Zona Oeste",
] as const;