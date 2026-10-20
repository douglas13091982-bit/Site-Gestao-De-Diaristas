import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "professional" | "client";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  roles: Role[];
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let authEventSeen = false;
    let sessionRevision = 0;

    const applySession = async (nextSession: Session | null) => {
      const revision = ++sessionRevision;
      if (!mounted) return;

      setSession(nextSession);
      if (!nextSession?.user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", nextSession.user.id);

        // Ignore results from an older session (for example, a role query
        // that finishes after the user has signed out or switched accounts).
        if (!mounted || revision !== sessionRevision) return;
        if (error) {
          console.error("[Auth] Failed to load user roles:", error.message);
          setRoles([]);
        } else {
          setRoles((data ?? []).map((row) => row.role as Role));
        }
      } catch (error) {
        if (!mounted || revision !== sessionRevision) return;
        console.error("[Auth] Unexpected error loading user roles:", error);
        setRoles([]);
      } finally {
        if (mounted && revision === sessionRevision) setLoading(false);
      }
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventSeen = true;
      void applySession(nextSession);
    });

    // INITIAL_SESSION is emitted by Supabase Auth when the listener attaches.
    // Keep getSession as a fallback, but don't let its potentially stale result
    // overwrite a newer auth event.
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (!authEventSeen) void applySession(data.session);
      })
      .catch((error: unknown) => {
        if (!mounted || authEventSeen) return;
        console.error("[Auth] Failed to restore session:", error);
        void applySession(null);
      });

    return () => {
      mounted = false;
      sessionRevision += 1;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const context = useContext(Ctx);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
