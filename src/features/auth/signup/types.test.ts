import { describe, it, expect } from "vitest";
import {
  normalizeTipo,
  emptyClientFields,
  emptyProfessionalFields,
  PROPERTY_TYPES,
  PROFESSIONAL_REGIONS,
} from "./types";

describe("normalizeTipo", () => {
  it.each([
    ["client", "client"],
    ["cliente", "client"],
    ["professional", "professional"],
    ["profissional", "professional"],
    ["worker", "professional"],
  ] as const)("mapeia %s → %s", (input, expected) => {
    expect(normalizeTipo(input)).toBe(expected);
  });
  it("retorna null para valor desconhecido", () => {
    expect(normalizeTipo("admin")).toBeNull();
    expect(normalizeTipo("")).toBeNull();
  });
});

describe("factory de estados vazios", () => {
  it("emptyClientFields devolve novo objeto a cada chamada", () => {
    const a = emptyClientFields();
    const b = emptyClientFields();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
    expect(a.propertyType).toBe("");
  });
  it("emptyProfessionalFields inicia arrays vazios e pixKeyType=cpf", () => {
    const f = emptyProfessionalFields();
    expect(f.specialties).toEqual([]);
    expect(f.regions).toEqual([]);
    expect(f.pixKeyType).toBe("cpf");
  });
});

describe("catálogos constantes", () => {
  it("PROPERTY_TYPES contém casa e apartamento", () => {
    const values = PROPERTY_TYPES.map((p) => p.value);
    expect(values).toContain("casa");
    expect(values).toContain("apartamento");
  });
  it("PROFESSIONAL_REGIONS tem 5 zonas", () => {
    expect(PROFESSIONAL_REGIONS.length).toBe(5);
  });
});