// Validação de CPF (algoritmo oficial da Receita Federal).

export function isValidCPF(input: string): boolean {
  const cpf = input.replace(/\D/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);
  const calc = (slice: number[], factor: number) => {
    const sum = slice.reduce((acc, d, i) => acc + d * (factor - i), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const d1 = calc(digits.slice(0, 9), 10);
  const d2 = calc(digits.slice(0, 10), 11);
  return d1 === digits[9] && d2 === digits[10];
}