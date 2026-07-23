export function registerAppServiceWorker(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  // Não registra em previews do Lovable / iframe / dev.
  try {
    const host = window.location.hostname;
    const inIframe = window.self !== window.top;
    const isPreview =
      host.startsWith("id-preview--") ||
      host.startsWith("preview--") ||
      host.endsWith(".lovableproject.com") ||
      host.endsWith(".lovableproject-dev.com") ||
      host.endsWith(".beta.lovable.dev");
    if (inIframe || isPreview) return;
    if (new URLSearchParams(window.location.search).get("sw") === "off") {
      navigator.serviceWorker.getRegistrations().then((regs) =>
        regs.forEach((r) => {
          if (r.active?.scriptURL.endsWith("/sw.js")) r.unregister();
        }),
      );
      return;
    }
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  } catch {
    /* noop */
  }
}