import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { DashboardModuleGrid } from "@/components/DashboardModuleGrid";
import { PROFESSIONAL_TABS, PRO_MODULES, ProfessionalFloatingMenu } from "@/components/ProfessionalFloatingMenu";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { registerPushDevice, isPushDeviceRegistered } from "@/lib/push-device";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/pro")({
  head: () => ({ meta: [{ title: "Área da diarista — Gersepa Solutions" }, { name: "description", content: "Painel da diarista." }] }),
  component: ProLayout,
});

function ProLayout() {
  const { user } = useAuth();
  const loc = useLocation();
  const qc = useQueryClient();
  const [pushReady, setPushReady] = useState(false);
  const pushRegistration = useMutation({mutationFn: async () => registerPushDevice(user!.id),onSuccess: ok => {setPushReady(ok); if(ok) toast.success("Notificações ativadas"); else toast.info("Autorize as notificações no dispositivo.");},onError: (e:Error)=>toast.error(e.message)});
  const [code, setCode] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const rpc = supabase.rpc.bind(supabase) as unknown as (name: string, args?: Record<string, unknown>) => Promise<{data: unknown; error: {message: string} | null}>;
  const profile = useQuery({
    queryKey: ["me-profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("is_professional,full_name,is_available,rating,total_bookings,profile_photo,phone,city,bio,experience,specialties,pix_key").eq("id", user!.id).maybeSingle()).data,
  });

  const verification = useQuery({
    queryKey: ["onboarding-whatsapp", user?.id, profile.data?.phone],
    enabled: !!user && !!profile.data?.is_professional,
    refetchInterval: 30000,
    queryFn: async () => {
      const rpc = supabase.rpc.bind(supabase) as unknown as (name: string, args: Record<string, unknown>) => Promise<{data: unknown; error: {message: string} | null}>;
      const result = await rpc("whatsapp_manual_status", {p_id: user!.id});
      if (result.error) throw new Error(result.error.message);
      return result.data === true;
    },
  });
  const config = useQuery({
    queryKey: ["onboarding-company-whatsapp", user?.id],
    enabled: !!user && !!profile.data?.is_professional && verification.data !== true,
    queryFn: async () => {
      const result = await rpc("whatsapp_manual_config");
      if (result.error) throw new Error(result.error.message);
      return result.data as string | null;
    },
  });
  const request = useMutation({
    mutationFn: async () => {
      const phone = (phoneDraft || profile.data?.phone || String(user?.user_metadata?.phone ?? "")).replace(/\D/g, "");
      if (!/^(?:55)?[1-9][0-9]9[0-9]{8}$/.test(phone)) throw new Error("Informe um WhatsApp válido com DDD.");
      if (phone !== profile.data?.phone) {
        const {error} = await supabase.from("profiles").update({phone}).eq("id", user!.id);
        if (error) throw error;
      }
      const result = await rpc("whatsapp_manual_request");
      if (result.error) throw new Error(result.error.message);
      return String(result.data);
    },
    onSuccess: async (value) => {setCode(value); await qc.invalidateQueries({queryKey:["me-profile",user?.id]});},
  });
  const steps = [
    {label: "Confirmar WhatsApp", done: verification.data === true},
    {label: "Foto de perfil", done: !!profile.data?.profile_photo},
    {label: "Cidade de atendimento", done: !!profile.data?.city},
    {label: "Experiência e especialidades", done: !!profile.data?.experience && !!profile.data?.specialties?.length},
    {label: "Dados para recebimento", done: !!profile.data?.pix_key},
  ];
  const progress = Math.round(100 * steps.filter(s => s.done).length / steps.length);
  if (profile.isLoading) return <div className="min-h-screen bg-background"><Header /><main className="p-10 text-muted-foreground">Carregando…</main></div>;

  if (profile.data && !profile.data.is_professional) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-2xl mx-auto px-6 py-16 text-center">
          <h1 className="text-3xl font-bold">Torne-se uma diarista Gersepa</h1>
          <p className="text-muted-foreground mt-3">Complete o cadastro profissional para receber leads de clientes na sua cidade.</p>
          <Link to="/pro/profile" className="inline-flex mt-6 h-11 items-center justify-center rounded-md bg-primary px-6 text-primary-foreground font-medium">Completar perfil</Link>
        </main>
      </div>
    );
  }

  if (profile.data?.is_professional && verification.data !== true) {
    return <div className="min-h-screen bg-background"><Header/><main className="mx-auto max-w-md p-5"><section className="rounded-2xl border bg-card p-6 space-y-4">
      <h1 className="text-2xl font-bold">Confirme seu WhatsApp</h1>
      <p className="text-sm text-muted-foreground">Etapa obrigatória. Gere seu código e envie pelo WhatsApp cadastrado para nossa equipe confirmar.</p>
      <label className="block text-sm font-medium">Seu WhatsApp<input className="mt-1 w-full rounded-md border bg-background p-3" type="tel" value={phoneDraft || profile.data.phone || String(user?.user_metadata?.phone ?? "")} onChange={e=>{setPhoneDraft(e.target.value);setCode("");}} disabled={request.isPending}/></label>
      {verification.isError && <p className="text-sm text-destructive">Falha ao consultar a verificação. Atualize o status.</p>}
      {config.isError && <p className="text-sm text-destructive">Falha ao consultar o WhatsApp da empresa.</p>}
      {config.isSuccess && !config.data && <p className="text-sm">A empresa ainda precisa configurar seu WhatsApp de recebimento.</p>}
      <button className="w-full rounded-md bg-primary p-3 text-primary-foreground disabled:opacity-50" disabled={!config.data || request.isPending || verification.isLoading || verification.isError} onClick={()=>request.mutate()}>{request.isPending ? "Gerando…" : "Gerar código"}</button>
      {request.isError && <p className="text-sm text-destructive">{request.error.message}</p>}
      {code && config.data && <div className="space-y-3 text-center"><p className="text-3xl font-bold tracking-widest">{code}</p><a className="block rounded-md bg-emerald-600 p-3 text-white" href={`https://wa.me/${config.data}?text=${encodeURIComponent("Meu código de confirmação Gersepa: "+code)}`} target="_blank" rel="noopener noreferrer">Enviar código pelo WhatsApp</a><p className="text-sm">Aguardando confirmação da equipe.</p></div>}
      {user && <button type="button" className="w-full rounded-md border p-3" disabled={pushReady || pushRegistration.isPending} onClick={()=>{if(isPushDeviceRegistered(user.id)){setPushReady(true);toast.success("Notificações já ativadas");}else pushRegistration.mutate();}}>{pushReady?"Notificações ativadas":pushRegistration.isPending?"Ativando…":"Ativar notificações de aprovação"}</button>}
      <button className="w-full rounded-md border p-3" onClick={()=>{verification.refetch();config.refetch();}}>Atualizar status</button>
    </section></main></div>;
  }
  const isHome = loc.pathname === "/pro" || loc.pathname === "/pro/";

  return (
    <div className="min-h-screen bg-background">
      <Header dashboardHome={isHome} />
      <main className={`mx-auto px-4 py-4 sm:py-8 ${isHome ? "max-w-[430px] pb-28 md:pb-8" : "max-w-6xl pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-8"}`}>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to="/pro/profile" className="shrink-0">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full overflow-hidden bg-muted border-2 border-primary/20">
              {profile.data?.profile_photo ? (
                <img src={profile.data.profile_photo} alt="Foto" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-lg sm:text-xl font-semibold text-muted-foreground">
                  {(profile.data?.full_name || "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl sm:text-3xl font-bold">Olá, {profile.data?.full_name?.split(" ")[0] ?? "diarista"}</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1">Painel profissional Gersepa</p>
          </div>
        </div>
        {isHome && (
          <div className="mt-4 space-y-4">
            {progress < 100 && <section className="rounded-2xl border bg-card p-4 space-y-3"><h2 className="font-bold">Complete seu perfil</h2><p className="text-sm text-muted-foreground">Finalize os dados para começar a trabalhar.</p><div className="flex justify-between text-sm"><span>Progresso</span><strong>{progress}%</strong></div><progress className="w-full" value={progress} max={100}/>{steps.map(s => <div key={s.label} className="text-sm">{s.done ? "✓" : "○"} {s.label}</div>)}<Link to="/pro/profile" className="block rounded-md bg-primary p-3 text-center text-primary-foreground">Completar meu perfil</Link></section>}
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Nota" value={Number(profile.data?.rating ?? 0).toFixed(1)} />
              <Stat label="Serviços realizados" value={String(profile.data?.total_bookings ?? 0)} />
            </div>
            <DashboardModuleGrid label="Menu da diarista" modules={PRO_MODULES} />
          </div>
        )}
        {!isHome && (
          <>
            <nav className="mt-4 sm:mt-6 hidden md:flex gap-1 border-b">
              {PROFESSIONAL_TABS.map((t) => {
                const active = t.to !== "/pro" && loc.pathname.startsWith(t.to);
                const Icon = t.icon;
                return (
                  <Link key={t.to} to={t.to} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px inline-flex items-center gap-2 ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4 sm:mt-6"><Outlet /></div>
          </>
        )}
      </main>
      <ProfessionalFloatingMenu />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-3 text-center">
      <div className="text-[11px] sm:text-xs text-muted-foreground">{label}</div>
      <div className="font-bold text-sm sm:text-base truncate">{value}</div>
    </div>
  );
}
