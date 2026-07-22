import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Home, Calendar, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cliente")({
  head: () => ({ meta: [{ title: "Minha conta — Gersepa" }, { name: "description", content: "Área do cliente Gersepa." }] }),
  component: ClienteLayout,
});

function ClienteLayout() {
  const { user } = useAuth();
  const loc = useLocation();
  const profile = useQuery({
    queryKey: ["me-client-profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("full_name,profile_photo").eq("id", user!.id).maybeSingle()).data,
  });

  const tabs = [
    { to: "/cliente", label: "Início", icon: Home, exact: true },
    { to: "/cliente/agendamentos", label: "Agendamentos", icon: Calendar },
    { to: "/cliente/perfil", label: "Perfil", icon: User },
  ];

  const isActive = (t: { to: string; exact?: boolean }) =>
    t.exact ? loc.pathname === t.to || loc.pathname === t.to + "/" : loc.pathname.startsWith(t.to);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8 pb-24 md:pb-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to="/cliente/perfil" className="shrink-0">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full overflow-hidden bg-muted border-2 border-primary/20">
              {profile.data?.profile_photo ? (
                <img src={profile.data.profile_photo} alt="Foto" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-lg sm:text-xl font-semibold text-muted-foreground">
                  {(profile.data?.full_name || user?.email || "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl sm:text-3xl font-bold">Olá, {profile.data?.full_name?.split(" ")[0] ?? "cliente"}</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1">Minha conta Gersepa</p>
          </div>
        </div>
        <nav className="mt-4 sm:mt-6 hidden md:flex gap-1 border-b">
          {tabs.map((t) => {
            const active = isActive(t);
            return (
              <Link key={t.to} to={t.to} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 sm:mt-6"><Outlet /></div>
      </main>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border grid grid-cols-3 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((t) => {
          const active = isActive(t);
          const Icon = t.icon;
          return (
            <Link key={t.to} to={t.to} className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>
              <Icon className="h-5 w-5" />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}