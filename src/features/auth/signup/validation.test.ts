import { describe, it, expect } from "vitest";
import {
  validatePassword,
  validateClient,
  validateProfessional,
  validateSignup,
} from "./validation";
import { emptyClientFields, emptyProfessionalFields } from "./types";
import type { AvailabilityMap } from "@/shared/components/AvailabilityGrid";

const av = (entries: Array<[number, { on: boolean; start: string; end: string }]>): AvailabilityMap =>
  new Map(entries);

const fullAvailability = () =>
  av([[1, { on: true, start: "08:00", end: "17:00" }]]);

const fakeFile = () => new File(["x"], "p.jpg", { type: "image/jpeg" });

describe("validatePassword", () => {
  it("null quando forte", () => {
    expect(validatePassword("Abcdef1!")).toBeNull();
  });
  it("mensagem quando fraca", () => {
    expect(validatePassword("abc")).toMatch(/8 caracteres/);
  });
});

describe("validateClient", () => {
  it("exige propertyType", () => {
    const f = emptyClientFields();
    expect(validateClient(f)).toMatch(/tipo de imóvel/);
  });
  it("exige CPF de 11 dígitos", () => {
    const f = { ...emptyClientFields(), propertyType: "casa", cpf: "123" };
    expect(validateClient(f)).toMatch(/CPF/);
  });
  it("aceita cliente completo", () => {
    const f = { ...emptyClientFields(), propertyType: "casa", cpf: "52998224725" };
    expect(validateClient(f)).toBeNull();
  });
});

describe("validateProfessional", () => {
  const baseFields = () => ({
    ...emptyProfessionalFields(),
    category: "diarista",
    regions: ["Centro"],
  });

  it("exige categoria e regiões", () => {
    expect(validateProfessional(emptyProfessionalFields(), fullAvailability(), fakeFile()))
      .toMatch(/categoria/);
  });

  it("exige foto", () => {
    expect(validateProfessional(baseFields(), fullAvailability(), null))
      .toMatch(/foto/);
  });

  it("exige ao menos um dia disponível", () => {
    const noneOn = av([[1, { on: false, start: "08:00", end: "17:00" }]]);
    expect(validateProfessional(baseFields(), noneOn, fakeFile()))
      .toMatch(/dia de disponibilidade/);
  });

  it("recusa horário início >= fim", () => {
    const bad = av([[2, { on: true, start: "18:00", end: "17:00" }]]);
    expect(validateProfessional(baseFields(), bad, fakeFile()))
      .toMatch(/Horário inválido em Terça-feira/);
  });

  it("aceita profissional completo", () => {
    expect(validateProfessional(baseFields(), fullAvailability(), fakeFile())).toBeNull();
  });
});

describe("validateSignup", () => {
  const strong = "Abcdef1!";

  it("client: erra tipo imóvel primeiro, depois senha", () => {
    expect(
      validateSignup({
        tipo: "client",
        password: strong,
        clientFields: emptyClientFields(),
        professionalFields: emptyProfessionalFields(),
        availability: new Map(),
        photoFile: null,
      }),
    ).toMatch(/tipo de imóvel/);
  });

  it("client válido + senha fraca → mensagem de senha", () => {
    expect(
      validateSignup({
        tipo: "client",
        password: "fraca",
        clientFields: { ...emptyClientFields(), propertyType: "casa", cpf: "52998224725" },
        professionalFields: emptyProfessionalFields(),
        availability: new Map(),
        photoFile: null,
      }),
    ).toMatch(/8 caracteres/);
  });

  it("professional válido + senha forte → null", () => {
    expect(
      validateSignup({
        tipo: "professional",
        password: strong,
        clientFields: emptyClientFields(),
        professionalFields: { ...emptyProfessionalFields(), category: "diarista", regions: ["Centro"] },
        availability: fullAvailability(),
        photoFile: fakeFile(),
      }),
    ).toBeNull();
  });
});