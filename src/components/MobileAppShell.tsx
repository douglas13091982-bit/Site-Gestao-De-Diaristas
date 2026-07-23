import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, Search, Sparkles, Menu as MenuIcon, X, LogIn, UserPlus, Info, Phone, LayoutDashboard, Calendar, User, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

/**
 * Barra inferior estilo app nativo (4 abas): Início · Buscar · Trabalhe · Menu.
 * O botão "Menu" abre um bottom sheet com ações contextuais (Entrar/Criar Conta
 * ou Minha Conta/Sair, além de Sobre e Contato).
 */
export function MobileAppShell() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { user, roles, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const path = loc.pathname;

  const hiddenPrefixes = ["/pro", "/cliente", "/admin", "/auth", "/cadastro", "/onboarding", "/dashboard", "/bookings"];
  if (hiddenPrefixes.some((p) => path === p || path.startsWith(p + "/"))) return null;

  useEffect(() => { setOpen(false); }, [path]);

  const tabs = [
    { to: "/", label: "Início", icon: Home, exact: true },
    { to: "/professionals", label: "Buscar", icon: Search },
    { to: "/seja-diarista", label: "Trabalhe", icon: Sparkles },
  ];
  const isActive = (t: { to: string; exact?: boolean }) =>
    t.exact ? path === t.to : path === t.to || path.startsWith(t.to + "/");

  const homeForRole = roles.includes("admin")
    ? "/admin"
    : roles.includes("professional")
    ? "/pro"
    : "/cliente";

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur border-t border-border grid grid-cols-4 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        aria-label="Navegação principal"
      >
        {tabs.map((t) => {
          const active = isActive(t);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon className={`h-5 w-5 ${active ? "scale-110" : ""}`} />
              {t.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition ${open ? "text-primary" : "text-muted-foreground"}`}
          aria-label="Abrir menu"
        >
          <MenuIcon className="h-5 w-5" />
          Menu
        </button>
      </nav>

      {open && (
        <div className="md:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true">
          <button
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-background pb-[env(safe-area-inset-bottom)] shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-xl font-bold">Menu</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="border-t border-border" />
            <div className="px-4 py-3 flex flex-col">
              {user ? (
                <>
                  <MenuItem to={homeForRole} icon={LayoutDashboard} label="Minha Conta" primary />
                  <MenuItem to="/cliente/agendamentos" icon={Calendar} label="Meus Agendamentos" />
                  <MenuItem to="/cliente/perfil" icon={User} label="Perfil" />
                  <Divider />
                  <MenuItem to="/seja-diarista" icon={Info} label="Sobre" />
                  <MenuItem href="https://wa.me/5547999999999" icon={Phone} label="Contato" />
                  <Divider />
                  <button
                    onClick={async () => { await signOut(); setOpen(false); navigate({ to: "/" }); }}
                    className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-destructive hover:bg-muted text-left"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-semibold">Sair</span>
                  </button>
                </>
              ) : (
                <>
                  <MenuItem to="/auth" icon={LogIn} label="Entrar" primary />
                  <MenuItem to="/cadastro" icon={UserPlus} label="Criar Conta" />
                  <Divider />
                  <MenuItem to="/seja-diarista" icon={Info} label="Sobre" />
                  <MenuItem href="https://wa.me/5547999999999" icon={Phone} label="Contato" />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Divider() {
  return <div className="my-2 border-t border-border" />;
}

type ItemProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary?: boolean;
  to?: string;
  href?: string;
};
function MenuItem({ icon: Icon, label, primary, to, href }: ItemProps) {
  const cls = `flex items-center gap-3 px-3 py-3.5 rounded-xl ${primary ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`;
  const inner = (
    <>
      <Icon className="h-5 w-5" />
      <span className="font-semibold">{label}</span>
    </>
  );
  if (href) return <a href={href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>;
  return <Link to={to!} className={cls}>{inner}</Link>;
}

/** Padding inferior para páginas públicas não ficarem escondidas atrás do tab bar. */
export function MobileBottomSpacer() {
  const loc = useLocation();
  const path = loc.pathname;
  const hiddenPrefixes = ["/pro", "/cliente", "/admin", "/auth", "/cadastro", "/onboarding", "/dashboard", "/bookings"];
  if (hiddenPrefixes.some((p) => path === p || path.startsWith(p + "/"))) return null;
  return <div aria-hidden className="md:hidden h-20" />;
}