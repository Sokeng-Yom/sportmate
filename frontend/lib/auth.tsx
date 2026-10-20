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
  profileError: string | null;
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
  const [profileError, setProfileError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!session) return null;
    setLoading(true);
    setProfileError(null);
    try {
      const loaded = await fetchProfile();
      setProfile(loaded);
      if (!loaded) {
        setProfileError("No profile is linked to this account. Check your account setup and try again.");
      }
      return loaded;
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not load your account profile.");
      return null;
    } finally {
      setLoading(false);
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
              if (!cancelled) {
                setProfile(p);
                setProfileError(p ? null : "No profile is linked to this account. Check your account setup and try again.");
              }
            })
            .catch((error: unknown) => {
              if (!cancelled) {
                setProfile(null);
                setProfileError(error instanceof Error ? error.message : "Could not load your account profile.");
              }
            })
            .finally(() => {
              if (!cancelled) setLoading(false);
            });
        } else {
          setProfile(null);
          setProfileError(null);
          setLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setProfile(null);
          setProfileError(error instanceof Error ? error.message : "Could not check your sign-in session.");
          setLoading(false);
        }
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setProfileError(null);
      if (newSession) {
        setLoading(true);
        fetchProfile()
          .then((p) => {
            setProfile(p);
            setProfileError(p ? null : "No profile is linked to this account. Check your account setup and try again.");
          })
          .catch((error: unknown) => {
            setProfile(null);
            setProfileError(error instanceof Error ? error.message : "Could not load your account profile.");
          })
          .finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
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
    setProfileError(null);
  }, []);

  const role = useMemo<Role | null>(() => (profile ? (profile.role as Role) : null), [profile]);

  const value = useMemo(
    () => ({ session, profile, role, loading, profileError, refreshProfile, signOut }),
    [session, profile, role, loading, profileError, refreshProfile, signOut],
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
  const { session, profile, role, loading, profileError, refreshProfile, signOut } = useAuth();
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
  if (!profile || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6 dark:bg-slate-950">
        <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Could not load your account</h1>
          <p role="alert" className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {profileError ?? "Your account profile is unavailable. Check your backend connection and account setup."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => void refreshProfile()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Try again
            </button>
            <button
              onClick={() => void signOut()}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (!roles.includes(role)) return <AuthLoading />;
  return <>{children}</>;
}

/** Export for callers that need the role-home mapping (e.g. after login). */
export { ROLE_HOME };
