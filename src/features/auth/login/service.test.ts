import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do cliente Supabase antes do import do serviço.
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
// Evita import real de server-fns (rede/RPC) — usadas apenas via re-export.
vi.mock("@/lib/account.functions", () => ({
  checkEmailRegistered: vi.fn(),
  sendPasswordSetupEmail: vi.fn(),
}));

import {
  signInWithPassword as signIn,
  signUpAccount,
  requestPasswordSetupEmail,
} from "./service";

// jsdom não é o ambiente padrão; garante window.location.origin p/ redirects.
beforeEach(() => {
  signInWithPassword.mockReset();
  signUp.mockReset();
  // @ts-expect-error stub simples para ambiente node
  globalThis.window = { location: { origin: "https://app.test" } };
});

describe("signInWithPassword", () => {
  it("ok quando credenciais válidas", async () => {
    signInWithPassword.mockResolvedValueOnce({ error: null });
    const check = vi.fn();
    await expect(signIn("a@b.com", "x", check)).resolves.toEqual({ ok: true });
    expect(check).not.toHaveBeenCalled();
  });

  it("sinaliza needsSetup quando credenciais inválidas e email existente", async () => {
    signInWithPassword.mockResolvedValueOnce({ error: { message: "Invalid login credentials" } });
    const check = vi.fn().mockResolvedValue({ exists: true });
    await expect(signIn("a@b.com", "x", check)).resolves.toEqual({ ok: false, needsSetup: true });
    expect(check).toHaveBeenCalledWith({ data: { email: "a@b.com" } });
  });

  it("relança erro quando email não existe", async () => {
    const error = { message: "Invalid credentials" };
    signInWithPassword.mockResolvedValueOnce({ error });
    const check = vi.fn().mockResolvedValue({ exists: false });
    await expect(signIn("a@b.com", "x", check)).rejects.toBe(error);
  });

  it("relança erro não-credencial sem checar email", async () => {
    const error = { message: "Network down" };
    signInWithPassword.mockResolvedValueOnce({ error });
    const check = vi.fn();
    await expect(signIn("a@b.com", "x", check)).rejects.toBe(error);
    expect(check).not.toHaveBeenCalled();
  });
});

describe("signUpAccount", () => {
  const args = { email: "a@b.com", password: "S3nha!!!", fullName: "Ana", role: "client" as const };

  it("retorna needsSetup se email já existe", async () => {
    const check = vi.fn().mockResolvedValue({ exists: true });
    await expect(signUpAccount(args, check)).resolves.toEqual({ ok: false, needsSetup: true });
    expect(signUp).not.toHaveBeenCalled();
  });

  it("cria conta quando email é novo", async () => {
    const check = vi.fn().mockResolvedValue({ exists: false });
    signUp.mockResolvedValueOnce({ error: null });
    await expect(signUpAccount(args, check)).resolves.toEqual({ ok: true });
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: args.email,
      password: args.password,
      options: expect.objectContaining({
        emailRedirectTo: "https://app.test/onboarding",
        data: expect.objectContaining({ full_name: "Ana", role: "client" }),
      }),
    }));
  });

  it("propaga erro do supabase.auth.signUp", async () => {
    const check = vi.fn().mockResolvedValue({ exists: false });
    const error = { message: "boom" };
    signUp.mockResolvedValueOnce({ error });
    await expect(signUpAccount(args, check)).rejects.toBe(error);
  });
});

describe("requestPasswordSetupEmail", () => {
  it("retorna notRegistered quando email não existe", async () => {
    const check = vi.fn().mockResolvedValue({ exists: false });
    const send = vi.fn();
    await expect(requestPasswordSetupEmail("a@b.com", check, send))
      .resolves.toEqual({ ok: false, notRegistered: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("envia link quando email existe", async () => {
    const check = vi.fn().mockResolvedValue({ exists: true });
    const send = vi.fn().mockResolvedValue(undefined);
    await expect(requestPasswordSetupEmail("a@b.com", check, send))
      .resolves.toEqual({ ok: true });
    expect(send).toHaveBeenCalledWith({
      data: { email: "a@b.com", redirectTo: "https://app.test/reset-password" },
    });
  });
});