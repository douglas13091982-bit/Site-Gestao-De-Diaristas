import { describe, it, expect, vi, beforeEach } from "vitest";

const signInWithPassword = vi.fn();
const signUp = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
      signUp: (...args: unknown[]) => signUp(...args),
    },
  },
}));
vi.mock("@/lib/account.functions", () => ({
  sendPasswordSetupEmail: vi.fn(),
}));

import {
  signInWithPassword as signIn,
  signUpAccount,
  requestPasswordSetupEmail,
} from "./service";

beforeEach(() => {
  signInWithPassword.mockReset();
  signUp.mockReset();
  // @ts-expect-error stub simples p/ ambiente node
  globalThis.window = { location: { origin: "https://app.test" } };
});

describe("signInWithPassword", () => {
  it("ok quando credenciais válidas", async () => {
    signInWithPassword.mockResolvedValueOnce({ error: null });
    await expect(signIn("a@b.com", "x")).resolves.toEqual({ ok: true });
  });

  it("propaga erro sem sondar existência do e-mail", async () => {
    const error = { message: "Invalid login credentials" };
    signInWithPassword.mockResolvedValueOnce({ error });
    await expect(signIn("a@b.com", "x")).rejects.toBe(error);
  });
});

describe("signUpAccount", () => {
  const args = { email: "a@b.com", password: "S3nha!!!", fullName: "Ana", role: "client" as const };

  it("cria conta e envia dados esperados ao Supabase", async () => {
    signUp.mockResolvedValueOnce({ error: null });
    await expect(signUpAccount(args)).resolves.toEqual({ ok: true });
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: args.email,
      password: args.password,
      options: expect.objectContaining({
        emailRedirectTo: "https://app.test/dashboard",
        data: expect.objectContaining({ full_name: "Ana", role: "client" }),
      }),
    }));
  });

  it("propaga erro do supabase.auth.signUp", async () => {
    const error = { message: "boom" };
    signUp.mockResolvedValueOnce({ error });
    await expect(signUpAccount(args)).rejects.toBe(error);
  });
});

describe("requestPasswordSetupEmail", () => {
  it("sempre chama sendSetup e retorna ok (sem revelar existência)", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await expect(requestPasswordSetupEmail("a@b.com", send)).resolves.toEqual({ ok: true });
    expect(send).toHaveBeenCalledWith({
      data: { email: "a@b.com", redirectTo: "https://app.test/reset-password" },
    });
  });
});