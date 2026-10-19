"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabaseClient";
import { apiClient, ApiError } from "./apiClient";
import { getProfile } from "./api";
import type { Profile, Role } from "./types";

type SupabaseSession = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"];

interface AuthContextValue {
  session: SupabaseSession | null;
  profile: Profile | null;
  role: Role | null;
  /** True until the initial session + profile check finishes. */
  loading: boolean;
  /** Refreshes the profile from GET /api/v1/profiles/me. */
  refreshProfile: () => Promise<Profile | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(): Promise<Profile | null> {
  try {
    return await getProfile();
  } catch (error) {
    // A missing/expired profile must not brick the whole app — callers handle null.
    if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
      return null;
    }
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!session) return null;
    try {
      const loaded = await fetchProfile();
      setProfile(loaded);
      return loaded;
    } catch {
      // Network/backend errors are surfaced to the caller; keep the old profile.
      return null;
    }
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        if (data.session) {
          fetchProfile()
            .then((p) => {
              if (!cancelled) setProfile(p);
            })
            .catch(() => {
              if (!cancelled) setProfile(null);
            })
            .finally(() => {
              if (!cancelled) setLoading(false);
            });
        } else {
          setProfile(null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfile(null);
          setLoading(false);
        }
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        fetchProfile()
          .then((p) => setProfile(p))
          .catch(() => setProfile(null));
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const role = useMemo<Role | null>(() => (profile ? (profile.role as Role) : null), [profile]);

  const value = useMemo(
    () => ({ session, profile, role, loading, refreshProfile, signOut }),
    [session, profile, role, loading, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/** Full-screen spinner shown while auth/profile is being resolved. */
export function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading…</p>
      </div>
    </div>
  );
}

const ROLE_HOME: Record<Role, string> = {
  PLAYER: "/player/dashboard",
  VENUE_OWNER: "/venue-owner",
  ADMIN: "/venue-owner",
};

/**
 * Role-based route guard. Renders children only when the signed-in user's
 * profile role is in `roles`. Otherwise it redirects: unauthenticated users go
 * to /login, and users with the wrong role go to their own home page.
 */
export function RouteGuard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { session, profile, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (role && !roles.includes(role)) {
      router.replace(ROLE_HOME[role]);
    }
  }, [loading, session, role, roles, router]);

  if (loading || !session) return <AuthLoading />;
  if (!role || !roles.includes(role)) return <AuthLoading />;
  return <>{children}</>;
}

/** Export for callers that need the role-home mapping (e.g. after login). */
export { ROLE_HOME };
