// Regras de precificação isoladas — testáveis e reutilizáveis.

const DEFAULT_COMMISSION_PCT = 20;

/** Valor líquido que a diarista recebe após comissão da plataforma. */
export function professionalPayout(
  total: number,
  commissionPct: number = DEFAULT_COMMISSION_PCT,
): number {
  const pct = Number.isFinite(commissionPct) ? commissionPct : DEFAULT_COMMISSION_PCT;
  const factor = 1 - pct / 100;
  return Math.max(0, Math.round(total * factor * 100) / 100);
}

/** Valor bruto que a plataforma retém. */
export function platformFee(
  total: number,
  commissionPct: number = DEFAULT_COMMISSION_PCT,
): number {
  return Math.max(0, Math.round((total - professionalPayout(total, commissionPct)) * 100) / 100);
}