import { describe, it, expect } from "vitest";
import { isValidCPF } from "./cpf";

describe("isValidCPF", () => {
  it.each([
    "529.982.247-25",
    "52998224725",
    "111.444.777-35",
  ])("aceita CPF válido %s", (cpf) => {
    expect(isValidCPF(cpf)).toBe(true);
  });

  it.each([
    "",
    "123",
    "12345678900",
    "529.982.247-24", // dígito verificador errado
    "abcdefghijk",
  ])("rejeita CPF inválido %s", (cpf) => {
    expect(isValidCPF(cpf)).toBe(false);
  });

  it("rejeita sequências repetidas (000..., 111..., 999...)", () => {
    for (let d = 0; d <= 9; d++) {
      expect(isValidCPF(String(d).repeat(11))).toBe(false);
    }
  });

  it("ignora máscara/caracteres não numéricos", () => {
    expect(isValidCPF("529-982-247.25")).toBe(true);
  });
});