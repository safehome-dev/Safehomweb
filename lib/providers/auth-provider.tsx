"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(
    async (uid: string): Promise<Profile | null> => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      return data as Profile | null;
    },
    [supabase]
  );

  const enforceSuspension = useCallback(
    async (uid: string) => {
      const p = await fetchProfile(uid);
      if (p?.is_suspended) {
        toast.error("Account suspended", {
          description: p.suspension_reason ?? "Contact support.",
        });
        await supabase.auth.signOut();
        return null;
      }
      return p;
    },
    [fetchProfile, supabase]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        const p = await enforceSuspension(data.session.user.id);
        if (mounted) setProfile(p);
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e: string, s: Session | null) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const p = await enforceSuspension(s.user.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, enforceSuspension]);

  const signIn = useCallback<AuthContextValue["signIn"]>(
    async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    [supabase]
  );

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async (email, password, name) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) return { error: error.message };

      // Best-effort record terms acceptance + profile name. The Supabase trigger
      // usually creates the profile row; we just patch the columns we know.
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase.from("profiles").upsert({
          id: u.user.id,
          name,
          terms_accepted_at: new Date().toISOString(),
        });
      }
      return { error: null };
    },
    [supabase]
  );

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }, [supabase, router]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    setProfile(await fetchProfile(user.id));
  }, [user, fetchProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      refreshProfile,
    }),
    [session, user, profile, loading, signIn, signUp, signInWithGoogle, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
