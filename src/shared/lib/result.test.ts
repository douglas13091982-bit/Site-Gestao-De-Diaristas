import { describe, it, expect } from "vitest";
import { ok, err, toMessage, wrapSupabase, tryAsync } from "./result";

describe("ok/err", () => {
  it("cria variantes tipadas", () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err("x")).toEqual({ ok: false, error: "x" });
  });
});

describe("toMessage", () => {
  it("extrai de Error", () => {
    expect(toMessage(new Error("boom"))).toBe("boom");
  });
  it("aceita string direta", () => {
    expect(toMessage("oops")).toBe("oops");
  });
  it("extrai de objeto com message", () => {
    expect(toMessage({ message: "hi" })).toBe("hi");
  });
  it("fallback quando vazio ou desconhecido", () => {
    expect(toMessage(null)).toBe("Erro inesperado");
    expect(toMessage(undefined, "custom")).toBe("custom");
    expect(toMessage({}, "fb")).toBe("fb");
    expect(toMessage(123, "fb")).toBe("fb");
  });
  it("Error sem message usa fallback", () => {
    expect(toMessage(new Error(""), "fb")).toBe("fb");
  });
});

describe("wrapSupabase", () => {
  it("ok quando data presente", () => {
    expect(wrapSupabase({ data: { a: 1 }, error: null })).toEqual({ ok: true, value: { a: 1 } });
  });
  it("err quando erro presente", () => {
    expect(wrapSupabase({ data: null, error: { message: "x" } })).toEqual({ ok: false, error: "x" });
  });
  it("err quando sem dados", () => {
    expect(wrapSupabase({ data: null, error: null })).toEqual({ ok: false, error: "Sem dados" });
  });
});

describe("tryAsync", () => {
  it("captura sucesso", async () => {
    await expect(tryAsync(async () => 42)).resolves.toEqual({ ok: true, value: 42 });
  });
  it("captura erro", async () => {
    await expect(tryAsync(async () => { throw new Error("nope"); }))
      .resolves.toEqual({ ok: false, error: "nope" });
  });
});