// Result<T, E> — tipagem uniforme para chamadas Supabase/HTTP.
// Elimina try/catch repetido nas telas: services devolvem Result, componente decide.

export type Ok<T> = { ok: true; value: T };
export type Err<E = string> = { ok: false; error: E };
export type Result<T, E = string> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E = string>(error: E): Err<E> => ({ ok: false, error });

/** Extracts a readable message from unknown thrown values. */
export function toMessage(e: unknown, fallback = "Erro inesperado"): string {
  if (!e) return fallback;
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === "object" && e !== null && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  return fallback;
}

/**
 * Wraps a Supabase response ({ data, error }) into a Result.
 * Usage: `const r = wrapSupabase(await supabase.from("x").select())`
 */
export function wrapSupabase<T>(
  res: { data: T | null; error: { message: string } | null },
): Result<T> {
  if (res.error) return err(res.error.message);
  if (res.data == null) return err("Sem dados");
  return ok(res.data);
}

/** Runs an async fn and returns a Result instead of throwing. */
export async function tryAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await fn());
  } catch (e) {
    return err(toMessage(e));
  }
}