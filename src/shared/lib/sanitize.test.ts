import { describe, it, expect } from "vitest";
import {
  sanitizeText,
  sanitizeTextOrNull,
  sanitizeEmail,
  sanitizeDigits,
  sanitizeStringArray,
} from "./sanitize";

describe("sanitizeText", () => {
  it("remove tags HTML", () => {
    expect(sanitizeText("<script>alert(1)</script>Oi")).toBe("alert(1)Oi");
    expect(sanitizeText("<b>Bold</b>")).toBe("Bold");
  });

  it("remove protocolos perigosos", () => {
    expect(sanitizeText("javascript:alert(1)")).toBe("alert(1)");
    expect(sanitizeText("DATA:foo")).toBe("foo");
  });

  it("remove caracteres de controle", () => {
    expect(sanitizeText("a\u0000b\u0007c")).toBe("abc");
  });

  it("faz trim e aplica maxLength", () => {
    expect(sanitizeText("  hello  ", { maxLength: 3 })).toBe("hel");
  });

  it("colapsa espaços quando pedido", () => {
    expect(sanitizeText("a   b\n\nc", { collapseWhitespace: true })).toBe("a b c");
  });

  it("aceita null/undefined", () => {
    expect(sanitizeText(null)).toBe("");
    expect(sanitizeText(undefined)).toBe("");
  });
});

describe("sanitizeTextOrNull", () => {
  it("retorna null para vazio", () => {
    expect(sanitizeTextOrNull("   ")).toBeNull();
    expect(sanitizeTextOrNull("<br>")).toBeNull();
  });
  it("retorna string quando há conteúdo", () => {
    expect(sanitizeTextOrNull(" foo ")).toBe("foo");
  });
});

describe("sanitizeEmail", () => {
  it("normaliza para lowercase e trim", () => {
    expect(sanitizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });
});

describe("sanitizeDigits", () => {
  it("mantém apenas dígitos e respeita limite", () => {
    expect(sanitizeDigits("(47) 99999-8888")).toBe("47999998888");
    expect(sanitizeDigits("123456789012345678", 11)).toBe("12345678901");
  });
});

describe("sanitizeStringArray", () => {
  it("remove vazios, duplicatas e limita itens", () => {
    expect(
      sanitizeStringArray(["  a", "a", "<b>b</b>", "  ", "c"], { maxItems: 2 }),
    ).toEqual(["a", "b"]);
  });
  it("retorna [] para não-array", () => {
    expect(sanitizeStringArray("nope")).toEqual([]);
  });
});