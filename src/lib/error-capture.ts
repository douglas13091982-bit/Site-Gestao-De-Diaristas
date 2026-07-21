let lastError: unknown = undefined;

if (typeof globalThis !== "undefined") {
  // best-effort: capture unhandled promise rejections during SSR
  const g = globalThis as unknown as {
    addEventListener?: (t: string, cb: (e: unknown) => void) => void;
  };
  g.addEventListener?.("unhandledrejection", (event: unknown) => {
    const e = event as { reason?: unknown };
    lastError = e?.reason ?? event;
  });
  g.addEventListener?.("error", (event: unknown) => {
    const e = event as { error?: unknown };
    lastError = e?.error ?? event;
  });
}

export function consumeLastCapturedError(): unknown {
  const e = lastError;
  lastError = undefined;
  return e;
}