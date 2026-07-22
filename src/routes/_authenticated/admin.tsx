import { createFileRoute, Link, Outlet, useRouterState, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard, Users, Briefcase, Calendar, Plus, DollarSign,
  BarChart3, Palette, Settings as SettingsIcon, ShieldCheck, LogOut,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { useState, type ReactNode } from "react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Painel Admin — Gersepa Solutions" }] }),
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: AdminLayout,
});

type NavItem = { to: string; label: string; icon: typeof Users; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  { label: "Principal", items: [{ to: "/admin", label: "Visão Geral", icon: LayoutDashboard, exact: true }] },
  { label: "Gestão", items: [
    { to: "/admin/users", label: "Usuários", icon: Users },
    { to: "/admin/professionals", label: "Profissionais", icon: Briefcase },
    { to: "/admin/bookings", label: "Agendamentos", icon: Calendar },
    { to: "/admin/bookings/new", label: "Novo Agendamento", icon: Plus },
  ]},
  { label: "Financeiro", items: [
    { to: "/admin/finance", label: "Receita & Comissão", icon: DollarSign },
    { to: "/admin/reports", label: "Relatórios", icon: BarChart3 },
  ]},
  { label: "Sistema", items: [
    { to: "/admin/admins", label: "Admins", icon: ShieldCheck },
    { to: "/admin/appearance", label: "Aparência", icon: Palette },
    { to: "/admin/settings", label: "Configurações", icon: SettingsIcon },
  ]},
];

function AdminLayout() {
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-5 py-6 border-b border-slate-800">
          <div className="text-lg font-bold">Gersepa</div>
          <div className="text-xs text-slate-400">Painel Admin</div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-4 text-sm">
          {GROUPS.map((g) => <NavGroupBlock key={g.label} group={g} pathname={pathname} />)}
        </nav>
        <div className="border-t border-slate-800 p-4 text-xs">
          <div className="text-slate-400 mb-2 truncate">{user?.email}</div>
          <button onClick={signOut} className="flex items-center gap-2 text-slate-300 hover:text-white">
            <LogOut className="h-4 w-4" /> Sair do Admin
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0"><Outlet /></main>
    </div>
  );
}

function NavGroupBlock({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
        <span>{group.label}</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5">
          {group.items.map((it) => {
            const active = it.exact ? pathname === it.to : pathname === it.to || pathname.startsWith(it.to + "/");
            return (
              <li key={it.to}>
                <Link to={it.to} className={`flex items-center gap-2 px-3 py-2 rounded-md ${active ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
                  <it.icon className="h-4 w-4" /> {it.label}
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