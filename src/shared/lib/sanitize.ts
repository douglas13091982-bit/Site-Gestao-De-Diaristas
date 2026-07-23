// Sanitização de inputs de usuário. Fonte única de regras.
//
// Objetivo: proteger o app contra dados maliciosos ou malformados antes
// de gravar no banco, enviar para APIs externas (Mercado Pago, PagSeguro,
// WhatsApp) ou renderizar. React já escapa JSX por padrão, então o foco
// aqui é:
//   - remover caracteres de controle (evita quebra de logs/CSV/JSON);
//   - remover tags HTML / scripts que possam vir em campos de texto;
//   - fazer trim e aplicar limite de tamanho para prevenir abuso;
//   - normalizar e-mails e telefones antes de persistir.
//
// Todas as funções são puras e seguras para chamar tanto no cliente
// quanto no servidor (não usam window/document).

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAG = /<\/?[a-zA-Z][^>]*>/g;
// Remove sequências perigosas (javascript:, data:, vbscript:) usadas em XSS.
const DANGEROUS_PROTOCOL = /\b(?:javascript|vbscript|data)\s*:/gi;

export type SanitizeOptions = {
  /** Tamanho máximo (default 500). Excedente é truncado silenciosamente. */
  maxLength?: number;
  /** Se true, colapsa espaços/quebras em um único espaço. */
  collapseWhitespace?: boolean;
};

/**
 * Sanitiza texto livre (nome, endereço, observação, bio, etc.).
 * NÃO destinado para HTML — sempre remove tags. Nunca use o resultado
 * em `dangerouslySetInnerHTML`.
 */
export function sanitizeText(input: unknown, opts: SanitizeOptions = {}): string {
  if (input == null) return "";
  const raw = String(input);
  const noHtml = raw.replace(HTML_TAG, "");
  const noProto = noHtml.replace(DANGEROUS_PROTOCOL, "");
  const noCtrl = noProto.replace(CONTROL_CHARS, "");
  const collapsed = opts.collapseWhitespace ? noCtrl.replace(/\s+/g, " ") : noCtrl;
  const trimmed = collapsed.trim();
  const max = Math.max(1, opts.maxLength ?? 500);
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/** Igual a sanitizeText mas retorna null quando resultado vazio. */
export function sanitizeTextOrNull(input: unknown, opts: SanitizeOptions = {}): string | null {
  const v = sanitizeText(input, opts);
  return v.length > 0 ? v : null;
}

/** Normaliza e-mail: trim + lowercase + limite. Retorna "" se vazio. */
export function sanitizeEmail(input: unknown): string {
  const v = sanitizeText(input, { maxLength: 255, collapseWhitespace: true });
  return v.toLowerCase();
}

/** Mantém apenas dígitos. Útil para telefone, CPF, CEP. */
export function sanitizeDigits(input: unknown, maxLength = 20): string {
  if (input == null) return "";
  return String(input).replace(/\D/g, "").slice(0, maxLength);
}

/** Sanitiza array de strings livres, descartando vazios e duplicatas. */
export function sanitizeStringArray(
  input: unknown,
  opts: SanitizeOptions & { maxItems?: number } = {},
): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const maxItems = opts.maxItems ?? 50;
  for (const item of input) {
    const v = sanitizeText(item, opts);
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
      if (out.length >= maxItems) break;
    }
  }
  return out;
}