import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

const DEFAULT_ROLE: AppRole = "customer";
const rolePriority: AppRole[] = ["super_admin", "owner", "admin", "driver", "customer", "household"];

const resolvePrimaryRole = (roles: AppRole[]): AppRole | null => {
  for (const candidate of rolePriority) {
    if (roles.includes(candidate)) {
      return candidate;
    }
  }

  return roles[0] ?? null;
};

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string): Promise<AppRole | null> => {
    try {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (error) {
        console.error("Failed to fetch user roles:", error);
        return null;
      }

      const roles = (data ?? []).map((item) => item.role);
      const resolvedRole = resolvePrimaryRole(roles);
      if (resolvedRole) {
        return resolvedRole;
      }

      const { error: insertError } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: DEFAULT_ROLE,
      });
      if (insertError && insertError.code !== "23505") {
        console.error("Failed to assign default role:", insertError);
        return null;
      }

      const { data: refreshedData, error: refreshError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (refreshError) {
        console.error("Failed to refresh user roles after default assignment:", refreshError);
        return DEFAULT_ROLE;
      }

      const refreshedRoles = (refreshedData ?? []).map((item) => item.role);
      return resolvePrimaryRole(refreshedRoles) ?? DEFAULT_ROLE;
    } catch (error) {
      console.error("Unexpected error while resolving user role:", error);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        setLoading(true);
        // Use setTimeout to avoid Supabase client deadlock, but await fetchRole
        // before clearing loading so the role is resolved before Dashboard renders.
        setTimeout(async () => {
          if (!isMounted) return;
          const resolvedRole = await fetchRole(nextSession.user.id);
          if (!isMounted) return;
          setRole(resolvedRole);
          setLoading(false);
        }, 0);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    void supabase.auth
      .getSession()
      .then(async ({ data: { session: initialSession } }) => {
        if (!isMounted) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          const resolvedRole = await fetchRole(initialSession.user.id);
          if (!isMounted) return;
          setRole(resolvedRole);
        } else {
          setRole(null);
        }

        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to get initial session:", error);
        if (!isMounted) return;
        setRole(null);
        setLoading(false);
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return <AuthContext.Provider value={{ user, session, role, loading, signOut }}>{children}</AuthContext.Provider>;
};
