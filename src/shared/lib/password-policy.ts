// Regras de senha usadas em cadastro e reset. Fonte única.

export type PasswordRule = {
  key: string;
  label: string;
  test: (value: string) => boolean;
};

export const PASSWORD_RULES: readonly PasswordRule[] = [
  { key: "length", label: "Mínimo de 8 caracteres", test: (v) => v.length >= 8 },
  { key: "upper", label: "1 letra maiúscula (A-Z)", test: (v) => /[A-Z]/.test(v) },
  { key: "lower", label: "1 letra minúscula (a-z)", test: (v) => /[a-z]/.test(v) },
  { key: "digit", label: "1 número (0-9)", test: (v) => /\d/.test(v) },
  {
    key: "special",
    label: "1 caractere especial (!@#$%…)",
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
] as const;

export function evaluatePassword(value: string) {
  const results = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(value) }));
  const allPassed = results.every((r) => r.ok);
  return { results, allPassed };
}