import { describe, it, expect } from "vitest";
import {
  formatMoney,
  formatMoneyPlain,
  formatCPF,
  formatCEP,
  formatPhone,
  onlyDigits,
  formatDateBR,
  formatTimeHM,
  initialsOf,
} from "./format";

// Normaliza espaços não-quebráveis usados pelo Intl.NumberFormat pt-BR.
const norm = (s: string) => s.replace(/\u00a0/g, " ");

describe("formatMoney", () => {
  it("formata número positivo em BRL", () => {
    expect(norm(formatMoney(1234.5))).toBe("R$ 1.234,50");
  });
  it("trata null/undefined/NaN como zero", () => {
    expect(norm(formatMoney(null))).toBe("R$ 0,00");
    expect(norm(formatMoney(undefined))).toBe("R$ 0,00");
    expect(norm(formatMoney(Number.NaN))).toBe("R$ 0,00");
  });
  it("formata valores negativos", () => {
    expect(norm(formatMoney(-10))).toMatch(/-\s?R\$\s?10,00|R\$\s?-10,00/);
  });
});

describe("formatMoneyPlain", () => {
  it("remove símbolo R$", () => {
    expect(norm(formatMoneyPlain(1234.5))).toBe("1.234,50");
  });
});

describe("formatCPF", () => {
  it("aplica máscara completa", () => {
    expect(formatCPF("52998224725")).toBe("529.982.247-25");
  });
  it("mascara parcialmente durante digitação", () => {
    expect(formatCPF("529")).toBe("529");
    expect(formatCPF("5299")).toBe("529.9");
    expect(formatCPF("529982247")).toBe("529.982.247");
  });
  it("descarta dígitos além dos 11 primeiros", () => {
    expect(formatCPF("529982247259999")).toBe("529.982.247-25");
  });
});

describe("formatCEP", () => {
  it("mascara 8 dígitos", () => {
    expect(formatCEP("01001000")).toBe("01001-000");
  });
  it("permite parcial", () => {
    expect(formatCEP("010")).toBe("010");
  });
});

describe("formatPhone", () => {
  it("formata celular (11 dígitos)", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
  });
  it("formata fixo (10 dígitos)", () => {
    expect(formatPhone("1132654321")).toBe("(11) 3265-4321");
  });
  it("descarta dígitos excedentes", () => {
    expect(formatPhone("11987654321999")).toBe("(11) 98765-4321");
  });
});

describe("onlyDigits", () => {
  it("remove tudo que não é dígito", () => {
    expect(onlyDigits("(11) 98765-4321")).toBe("11987654321");
    expect(onlyDigits("abc")).toBe("");
  });
});

describe("formatDateBR", () => {
  it("converte ISO em DD/MM/YYYY", () => {
    expect(formatDateBR("2024-03-15")).toBe("15/03/2024");
    expect(formatDateBR("2024-03-15T10:00:00Z")).toBe("15/03/2024");
  });
  it("retorna string vazia para entrada inválida ou vazia", () => {
    expect(formatDateBR(null)).toBe("");
    expect(formatDateBR("")).toBe("");
    expect(formatDateBR("abc")).toBe("");
  });
});

describe("formatTimeHM", () => {
  it("corta segundos", () => {
    expect(formatTimeHM("09:30:00")).toBe("09:30");
  });
  it("retorna vazio para nulo", () => {
    expect(formatTimeHM(null)).toBe("");
  });
});

describe("initialsOf", () => {
  it("extrai primeiras 2 iniciais em maiúsculo", () => {
    expect(initialsOf("Ana Silva")).toBe("AS");
    expect(initialsOf("maria clara souza")).toBe("MC");
  });
  it("retorna '?' quando vazio/nulo", () => {
    expect(initialsOf(null)).toBe("?");
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("   ")).toBe("?");
  });
  it("lida com nome único", () => {
    expect(initialsOf("Ana")).toBe("A");
  });
});