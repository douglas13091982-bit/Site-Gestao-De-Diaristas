import { describe, it, expect } from "vitest";
import { professionalPayout, platformFee } from "./price";

describe("professionalPayout", () => {
  it("aplica 20% de comissão por padrão", () => {
    expect(professionalPayout(100)).toBe(80);
    expect(professionalPayout(250)).toBe(200);
  });
  it("aceita comissão customizada", () => {
    expect(professionalPayout(100, 10)).toBe(90);
    expect(professionalPayout(100, 0)).toBe(100);
    expect(professionalPayout(100, 100)).toBe(0);
  });
  it("cai para default se comissão não for finita", () => {
    expect(professionalPayout(100, Number.NaN)).toBe(80);
    expect(professionalPayout(100, Number.POSITIVE_INFINITY)).toBe(80);
  });
  it("nunca retorna valor negativo", () => {
    expect(professionalPayout(100, 150)).toBe(0);
  });
  it("arredonda para 2 casas", () => {
    expect(professionalPayout(99.99, 20)).toBe(79.99);
  });
  it("total zero retorna zero", () => {
    expect(professionalPayout(0)).toBe(0);
  });
});

describe("platformFee", () => {
  it("complemento do payout", () => {
    expect(platformFee(100)).toBe(20);
    expect(platformFee(100, 30)).toBe(30);
  });
  it("total zero retorna zero", () => {
    expect(platformFee(0)).toBe(0);
  });
});