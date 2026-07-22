import { Link, useLocation } from "@tanstack/react-router";
import { Home, Users, CalendarPlus, Grid3x3, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

/**
 * Barra de navegação inferior estilo app nativo, visível apenas em mobile
 * nas páginas públicas / de cliente. Não aparece em áreas com seu próprio
 * shell (/pro, /cliente, /admin) nem em telas de auth/cadastro.
 */
export function MobileAppShell() {
  const loc = useLocation();
  const { user, roles } = useAuth();
  const path = loc.pathname;

  const hiddenPrefixes = ["/pro", "/cliente", "/admin", "/auth", "/cadastro", "/onboarding", "/dashboard", "/bookings"];
  if (hiddenPrefixes.some((p) => path === p || path.startsWith(p + "/"))) return null;
  if (roles.includes("professional") || roles.includes("admin")) return null;

  const accountHref = user ? "/cliente" : "/auth";

  const tabs = [
    { to: "/", label: "Início", icon: Home, exact: true },
    { to: "/professionals", label: "Diaristas", icon: Users },
    { to: "/agendamento-rapido", label: "Agendar", icon: CalendarPlus, highlight: true },
    { to: "/categorias", label: "Categorias", icon: Grid3x3 },
    { to: accountHref, label: user ? "Conta" : "Entrar", icon: User },
  ];

  const isActive = (t: { to: string; exact?: boolean }) =>
    t.exact ? path === t.to : path === t.to || path.startsWith(t.to + "/");

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur border-t border-border grid grid-cols-5 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      aria-label="Navegação principal"
    >
      {tabs.map((t) => {
        const active = isActive(t);
        const Icon = t.icon;
        if (t.highlight) {
          return (
            <Link key={t.to} to={t.to} className="flex flex-col items-center justify-end pb-1.5">
              <span className={`-mt-6 mb-1 grid h-12 w-12 place-items-center rounded-full text-primary-foreground shadow-lg ${active ? "bg-primary" : "bg-primary/90"}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className={`text-[10px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>{t.label}</span>
            </Link>
          );
        }
        return (
          <Link
            key={t.to + t.label}
            to={t.to}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition ${active ? "text-primary" : "text-muted-foreground"}`}
          >
            <Icon className={`h-5 w-5 ${active ? "scale-110" : ""}`} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Padding inferior para páginas públicas não ficarem escondidas atrás do tab bar. */
export function MobileBottomSpacer() {
  const loc = useLocation();
  const { roles } = useAuth();
  const path = loc.pathname;
  const hiddenPrefixes = ["/pro", "/cliente", "/admin", "/auth", "/cadastro", "/onboarding", "/dashboard", "/bookings"];
  if (hiddenPrefixes.some((p) => path === p || path.startsWith(p + "/"))) return null;
  if (roles.includes("professional") || roles.includes("admin")) return null;
  return <div aria-hidden className="md:hidden h-20" />;
}