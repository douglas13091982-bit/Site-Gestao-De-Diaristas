import { createFileRoute, Link, Outlet, useRouterState, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
 LayoutDashboard, Users, Briefcase, Calendar, DollarSign,
  BarChart3, Palette, Settings as SettingsIcon, ShieldCheck, LogOut,
  ChevronDown, ChevronRight, MapPin, Tag, Package, Bell, Ban, Webhook, Wallet, KeyRound,
  Menu, X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Painel Admin — Gersepa Solutions" }] }),
  beforeLoad: async ({ context }) => {
    // O gate pai (_authenticated) já garantiu sessão. Reaproveitamos
    // o user do context para evitar um segundo getUser lento que
    // pode disparar erros transitórios (e a tela "Algo deu errado").
    const user = (context as { user?: { id: string } }).user;
    if (!user) throw redirect({ to: "/auth" });
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!data) throw redirect({ to: "/" });
    } catch (err) {
      // Reencaminha redirects; qualquer outra falha volta para a home
      // silenciosamente, sem exibir errorComponent.
      if (err && typeof err === "object" && "to" in (err as object)) throw err;
      throw redirect({ to: "/" });
    }
  },
  component: AdminLayout,
});

type NavItem = { to: string; label: string; icon: typeof Users; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };

type BadgeCounts = Record<string, number>;

function useAdminBadges(): BadgeCounts {
  const { data } = useQuery({
    queryKey: ["admin-badges"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [bookings, withdrawals, resets] = await Promise.all([
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("password_reset_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return {
        "/admin/bookings": bookings.count ?? 0,
        "/admin/withdrawals": withdrawals.count ?? 0,
        "/admin/password-resets": resets.count ?? 0,
      } as BadgeCounts;
    },
  });
  return data ?? {};
}

const GROUPS: NavGroup[] = [
  { label: "Principal", items: [{ to: "/admin", label: "Visão Geral", icon: LayoutDashboard, exact: true }] },
  { label: "Gestão", items: [
    { to: "/admin/users", label: "Usuários", icon: Users },
    { to: "/admin/professionals", label: "Profissionais", icon: Briefcase },
    { to: "/admin/bookings", label: "Agendamentos", icon: Calendar },
  ]},
  { label: "Financeiro", items: [
    { to: "/admin/packages", label: "Pacotes", icon: Package },
    { to: "/admin/finance", label: "Receita & Comissão", icon: DollarSign },
    { to: "/admin/withdrawals", label: "Saques", icon: Wallet },
    { to: "/admin/reports", label: "Relatórios", icon: BarChart3 },
  ]},
  { label: "Plataforma", items: [
    { to: "/admin/categories", label: "Categorias", icon: Tag },
    { to: "/admin/cities", label: "Cidades", icon: MapPin },
    { to: "/admin/notifications", label: "Notificações Push", icon: Bell },
    { to: "/admin/password-resets", label: "Redefinir Senha", icon: KeyRound },
    { to: "/admin/blocked", label: "Bloqueados", icon: Ban },
  ]},
  { label: "Sistema", items: [
    { to: "/admin/admins", label: "Admins", icon: ShieldCheck },
    { to: "/admin/appearance", label: "Aparência", icon: Palette },
    { to: "/admin/webhooks", label: "Webhooks", icon: Webhook },
    { to: "/admin/settings", label: "Configurações", icon: SettingsIcon },
  ]},
];

function AdminLayout() {
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const badges = useAdminBadges();
  useEffect(() => {
    const ch = supabase
      .channel("admin-badges-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-badges"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-badges"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "password_reset_requests" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-badges"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);
  const totalBadges = Object.values(badges).reduce((a, b) => a + b, 0);
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <div className="min-h-screen md:flex bg-slate-50">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-slate-900 text-slate-100 px-4 py-3 border-b border-slate-800">
        <button
          onClick={() => setMobileOpen(true)}
          className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-slate-800"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
          {totalBadges > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">
              {totalBadges > 99 ? "99+" : totalBadges}
            </span>
          )}
        </button>
        <div className="text-center">
          <div className="text-sm font-bold leading-none">Gersepa</div>
          <div className="text-[10px] text-slate-400">Painel Admin</div>
        </div>
        <div className="h-9 w-9" />
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/50"
        />
      )}

      <aside
        className={`bg-slate-900 text-slate-100 flex flex-col
          fixed z-50 top-0 left-0 h-screen w-72 max-w-[85vw] transform transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:static md:translate-x-0 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:max-w-none`}
      >
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-base font-bold">Gersepa</div>
            <div className="text-[11px] text-slate-400">Painel Admin</div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-slate-800"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-2 text-[13px]">
          {GROUPS.map((g) => <NavGroupBlock key={g.label} group={g} pathname={pathname} badges={badges} />)}
        </nav>
        <div className="border-t border-slate-800 px-4 py-3 text-xs">
          <div className="text-slate-400 mb-1.5 truncate">{user?.email}</div>
          <button onClick={handleSignOut} className="flex items-center gap-2 text-slate-300 hover:text-white">
            <LogOut className="h-4 w-4" /> Sair do Admin
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0"><Outlet /></main>
    </div>
  );
}

function NavGroupBlock({ group, pathname, badges }: { group: NavGroup; pathname: string; badges: BadgeCounts }) {
  const [open, setOpen] = useState(true);
  const groupTotal = group.items.reduce((s, it) => s + (badges[it.to] ?? 0), 0);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300 hover:text-emerald-200">
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {group.label}
          {groupTotal > 0 && (
            <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center normal-case tracking-normal">
              {groupTotal > 99 ? "99+" : groupTotal}
            </span>
          )}
        </span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && (
        <ul className="mt-0.5 space-y-0">
          {group.items.map((it) => {
            const active = it.exact ? pathname === it.to : pathname === it.to || pathname.startsWith(it.to + "/");
            const count = badges[it.to] ?? 0;
            return (
              <li key={it.to}>
                <Link to={it.to} className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${active ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
                  <it.icon className="h-3.5 w-3.5" />
                  <span className="flex-1">{it.label}</span>
                  {count > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AdminPageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, color }: { label: string; value: ReactNode; icon: typeof Users; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs text-slate-500">{label}</div>
        <div className={`h-8 w-8 rounded-lg grid place-items-center text-white ${color}`}><Icon className="h-4 w-4" /></div>
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, pros, bookings, reviews, commissionSetting] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "professional"),
        supabase.from("bookings").select("id,status,total_price"),
        supabase.from("reviews").select("rating"),
        supabase.from("app_settings").select("setting_value").eq("setting_key", "commission_percentage").maybeSingle(),
      ]);
      const bks = bookings.data ?? [];
      const revenue = bks.filter(b => b.status === "completed").reduce((s, b) => s + Number(b.total_price ?? 0), 0);
      const pct = Number(commissionSetting.data?.setting_value ?? 20);
      const rs = reviews.data ?? [];
      const avg = rs.length ? rs.reduce((s, r) => s + r.rating, 0) / rs.length : 0;
      return {
        totalUsers: users.count ?? 0,
        totalPros: pros.count ?? 0,
        totalBookings: bks.length,
        revenue,
        commission: revenue * (pct / 100),
        commissionPct: pct,
        reviews: rs.length,
        pending: bks.filter(b => b.status === "pending").length,
        completed: bks.filter(b => b.status === "completed").length,
        avgRating: avg,
      };
    },
  });
}