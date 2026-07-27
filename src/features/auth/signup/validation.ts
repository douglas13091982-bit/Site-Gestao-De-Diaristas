import { evaluatePassword } from "@/shared/lib/password-policy";
import { onlyDigits } from "@/shared/lib/format";
import type { AvailabilityMap } from "@/shared/components/AvailabilityGrid";
import type {
  ClientFieldsState,
  ProfessionalFieldsState,
  SignupTipo,
} from "./types";

const WEEKDAY_LABELS = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado",
];

export type ValidationError = string;

export function validatePassword(password: string): ValidationError | null {
  return evaluatePassword(password).allPassed
    ? null
    : "A senha deve ter no mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.";
}

export function validateClient(f: ClientFieldsState): ValidationError | null {
  if (!f.propertyType) return "Selecione o tipo de imóvel.";
  if (onlyDigits(f.cpf).length !== 11) return "Informe um CPF válido (11 dígitos).";
  return null;
}

export function validateProfessional(
  f: ProfessionalFieldsState,
  availability: AvailabilityMap,
  photoFile: File | null,
  contact?: { email?: string; phone?: string },
): ValidationError | null {
  if (!f.category || f.regions.length === 0)
    return "Selecione a categoria e ao menos uma região atendida.";
  if (onlyDigits(f.cpf).length !== 11) return "Informe um CPF válido (11 dígitos).";
  if (!f.pixKey || f.pixKey.trim().length < 4) return "Informe uma chave PIX válida para recebimentos.";
  if (contact) {
    if (!contact.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim()))
      return "Informe um e-mail válido.";
    if (onlyDigits(contact.phone ?? "").length < 10)
      return "Informe um telefone válido com DDD.";
  }
  if (!photoFile) return "Envie uma foto de perfil.";
  const anyOn = Array.from(availability.values()).some((d) => d.on);
  if (!anyOn) return "Selecione ao menos um dia de disponibilidade.";
  for (const [idx, d] of availability.entries()) {
    if (d.on && d.start >= d.end) return `Horário inválido em ${WEEKDAY_LABELS[idx]}.`;
  }
  return null;
}

export function validateSignup(args: {
  tipo: SignupTipo;
  password: string;
  clientFields: ClientFieldsState;
  professionalFields: ProfessionalFieldsState;
  availability: AvailabilityMap;
  photoFile: File | null;
  email?: string;
  phone?: string;
}): ValidationError | null {
  if (args.tipo === "client") {
    const e = validateClient(args.clientFields);
    if (e) return e;
  } else {
    const e = validateProfessional(args.professionalFields, args.availability, args.photoFile, { email: args.email, phone: args.phone });
    if (e) return e;
  }
  return validatePassword(args.password);
}