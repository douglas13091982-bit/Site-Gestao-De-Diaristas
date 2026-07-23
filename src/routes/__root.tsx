import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/use-auth";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { MobileAppShell, MobileBottomSpacer } from "@/components/MobileAppShell";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Gersepa Solutions — Sua casa impecável em Joinville" },
      { name: "description", content: "Marketplace editorial de diaristas premium em Joinville. Curadoria rigorosa, pagamento seguro e garantia de satisfação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0c2340" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Gersepa" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:title", content: "Gersepa Solutions — Sua casa impecável em Joinville" },
      { name: "twitter:title", content: "Gersepa Solutions — Sua casa impecável em Joinville" },
      { property: "og:description", content: "Marketplace editorial de diaristas premium em Joinville. Curadoria rigorosa, pagamento seguro e garantia de satisfação." },
      { name: "twitter:description", content: "Marketplace editorial de diaristas premium em Joinville. Curadoria rigorosa, pagamento seguro e garantia de satisfação." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/pwje3BGBiWQ9qol52uRZMMVZkH63/social-images/social-1784817205461-ChatGPT_Image_23_de_jul._de_2026,_11_31_06.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/pwje3BGBiWQ9qol52uRZMMVZkH63/social-images/social-1784817205461-ChatGPT_Image_23_de_jul._de_2026,_11_31_06.webp" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Manrope:wght@400;500;600;700&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
      { rel: "apple-touch-icon", sizes: "192x192", href: "/icons/icon-192.png" },
      { rel: "apple-touch-icon", sizes: "512x512", href: "/icons/icon-512.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>
        <div
          id="gersepa-splash"
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5rem",
            background: "linear-gradient(135deg, #10b981 0%, #3aa8d8 100%)",
            transition: "opacity 400ms ease",
            pointerEvents: "none",
          }}
        >
          <img
            src="/icons/icon-512.png"
            alt="Gersepa Solutions"
            width={140}
            height={140}
            style={{
              width: 140,
              height: 140,
              borderRadius: 32,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              animation: "gersepaSplashPulse 1.4s ease-in-out infinite",
            }}
          />
          <div style={{ fontFamily: "Sora, system-ui, sans-serif", fontWeight: 700, fontSize: 22, color: "#fff", letterSpacing: "0.02em" }}>
            Gersepa Solutions
          </div>
          <div
            style={{
              width: 48,
              height: 3,
              borderRadius: 999,
              background: "rgba(255,255,255,0.4)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                inset: 0,
                background: "#fff",
                animation: "gersepaSplashBar 1.2s ease-in-out infinite",
              }}
            />
          </div>
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @keyframes gersepaSplashPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
                @keyframes gersepaSplashBar { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
                #gersepa-splash.gersepa-splash-hide { opacity: 0; }
              `,
            }}
          />
        </div>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  React.useEffect(() => {
    const el = document.getElementById("gersepa-splash");
    if (!el) return;
    const t = window.setTimeout(() => {
      el.classList.add("gersepa-splash-hide");
      window.setTimeout(() => el.remove(), 500);
    }, 350);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <MobileBottomSpacer />
        <MobileAppShell />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
