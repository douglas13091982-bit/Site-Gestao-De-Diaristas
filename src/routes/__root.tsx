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
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
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
