import { describe, it, expect } from "vitest";
import { PASSWORD_RULES, evaluatePassword } from "./password-policy";

describe("PASSWORD_RULES", () => {
  it("cobre 5 regras conhecidas", () => {
    expect(PASSWORD_RULES.map((r) => r.key)).toEqual([
      "length", "upper", "lower", "digit", "special",
    ]);
  });
});

describe("evaluatePassword", () => {
  it("marca todas as regras ok para senha forte", () => {
    const { results, allPassed } = evaluatePassword("Abcdef1!");
    expect(allPassed).toBe(true);
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it("falha length para senha curta", () => {
    const { results, allPassed } = evaluatePassword("Ab1!");
    expect(allPassed).toBe(false);
    expect(results.find((r) => r.key === "length")?.ok).toBe(false);
  });

  it.each([
    ["abcdef1!", "upper"],
    ["ABCDEF1!", "lower"],
    ["Abcdefgh!", "digit"],
    ["Abcdefg1", "special"],
  ])("falha regra %s quando entrada é %s", (input, expected) => {
    const { results } = evaluatePassword(input);
    expect(results.find((r) => r.key === expected)?.ok).toBe(false);
  });

  it("string vazia falha todas", () => {
    const { results, allPassed } = evaluatePassword("");
    expect(allPassed).toBe(false);
    expect(results.every((r) => !r.ok)).toBe(true);
  });
});