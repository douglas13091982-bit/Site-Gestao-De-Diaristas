// Pure formatters — no side effects, safe to unit-test.

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return BRL.format(0);
  return BRL.format(value);
}

/** Formats a number as BRL without the currency symbol (e.g. "1.234,56"). */
export function formatMoneyPlain(value: number | null | undefined): string {
  return formatMoney(value).replace(/^R\$\s?/, "");
}

export function formatCPF(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatCEP(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{5})(\d)/, "$1-$2");
}

export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** ISO date (YYYY-MM-DD) → "DD/MM/YYYY". Returns "" on invalid input. */
export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

/** "HH:MM:SS" → "HH:MM". */
export function formatTimeHM(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 5);
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}