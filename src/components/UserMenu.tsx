import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronDown,
  LayoutGrid,
  CalendarCheck,
  History,
  CalendarDays,
  Wallet,
  Calendar,
  User as UserIcon,
  ShieldCheck,
  LogOut,
  Users as UsersIcon,
  Settings,
} from "lucide-react";

type Profile = { full_name: string | null; avatar_url: string | null };

export function UserMenu() {
  const { user, roles, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data as Profile));
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!user) return null;

  const isAdmin = roles.includes("admin");
  const isPro = roles.includes("professional");
  const name = profile?.full_name || user.email?.split("@")[0] || "Conta";
  const initial = (name[0] || "?").toUpperCase();
  const roleLabel = isAdmin ? "Administrador" : isPro ? "Profissional" : "Cliente";
  const roleColor = isAdmin
    ? "bg-primary/10 text-primary"
    : isPro
    ? "bg-emerald-100 text-emerald-700"
    : "bg-sky-100 text-sky-700";

  const close = () => setOpen(false);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-border bg-background px-1.5 py-1 pr-3 hover:bg-muted transition"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-semibold">{initial}</span>
          )}
        </span>
        <span className="text-sm font-medium text-foreground max-w-[110px] truncate">{name.split(" ")[0]}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 rounded-2xl border border-border bg-popover shadow-xl overflow-hidden z-50"
        >
          <div className="p-4 border-b border-border">
            <div className="text-sm font-semibold text-foreground truncate">{name}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleColor}`}>
              <LayoutGrid className="h-3 w-3" /> {roleLabel}
            </span>
          </div>

          <div className="py-1 text-sm">
            {isAdmin && (
              <>
                <MenuLink to="/admin" onClick={close} icon={<ShieldCheck className="h-4 w-4" />} highlight>
                  Painel Admin
                </MenuLink>
                <MenuLink to="/admin/bookings" onClick={close} icon={<CalendarCheck className="h-4 w-4" />}>
                  Agendamentos
                </MenuLink>
                <MenuLink to="/admin/professionals" onClick={close} icon={<UsersIcon className="h-4 w-4" />}>
                  Profissionais
                </MenuLink>
                <MenuLink to="/admin/settings" onClick={close} icon={<Settings className="h-4 w-4" />}>
                  Configurações
                </MenuLink>
                <Divider />
              </>
            )}

            {isPro && (
              <>
                <MenuLink to="/pro" onClick={close} icon={<LayoutGrid className="h-4 w-4" />}>
                  Meu Painel
                </MenuLink>
                <MenuLink to="/pro/leads" onClick={close} icon={<CalendarCheck className="h-4 w-4" />}>
                  Próximos Serviços
                </MenuLink>
                <MenuLink to="/pro/history" onClick={close} icon={<History className="h-4 w-4" />}>
                  Histórico
                </MenuLink>
                <MenuLink to="/pro/availability" onClick={close} icon={<CalendarDays className="h-4 w-4" />}>
                  Disponibilidade
                </MenuLink>
                <MenuLink to="/pro/profile" onClick={close} icon={<UserIcon className="h-4 w-4" />}>
                  Meu Perfil
                </MenuLink>
                <Divider />
              </>
            )}

            {!isPro && !isAdmin && (
              <>
                <MenuLink to="/cliente" onClick={close} icon={<LayoutGrid className="h-4 w-4" />}>
                  Minha Conta
                </MenuLink>
                <MenuLink to="/cliente/agendamentos" onClick={close} icon={<Calendar className="h-4 w-4" />}>
                  Meus Agendamentos
                </MenuLink>
                <MenuLink to="/cliente/perfil" onClick={close} icon={<UserIcon className="h-4 w-4" />}>
                  Meu Perfil
                </MenuLink>
                <Divider />
              </>
            )}

            <button
              onClick={() => {
                close();
                signOut();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-destructive hover:bg-destructive/5"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  to,
  onClick,
  icon,
  children,
  highlight,
}: {
  to: string;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition ${
        highlight ? "text-primary font-semibold" : "text-foreground"
      }`}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}

function Divider() {
  return <div className="my-1 h-px bg-border" />;
}

function Wallet_() { return <Wallet className="h-4 w-4" />; }