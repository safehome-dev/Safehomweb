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
  deleteAccount: () => Promise<void>;
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

  // Mirrors mobile auth.deleteAccount — cascades through related tables, calls
  // the `delete-account` edge function to remove the auth user, then signs out.
  const deleteAccount = useCallback(async () => {
    const current = user;
    if (!current) throw new Error("Not signed in.");
    const uid = current.id;

    await supabase.from("earnings").delete().eq("user_id", uid);
    await supabase.from("withdrawal_requests").delete().eq("user_id", uid);
    await supabase.from("withdrawal_methods").delete().eq("user_id", uid);
    await supabase.from("service_reviews").delete().eq("customer_id", uid);
    await supabase.from("service_bookings").delete().eq("customer_id", uid);
    await supabase.from("service_providers").delete().eq("user_id", uid);
    const { data: roommateProfiles } = await supabase
      .from("roommate_profiles")
      .select("id")
      .eq("user_id", uid);
    const rmIds = ((roommateProfiles ?? []) as Array<{ id: string }>).map(
      (p) => p.id
    );
    if (rmIds.length) {
      await supabase.from("roommate_matches").delete().in("seeker_profile_id", rmIds);
      await supabase.from("roommate_matches").delete().in("provider_profile_id", rmIds);
    }
    await supabase.from("roommate_profiles").delete().eq("user_id", uid);
    await supabase
      .from("friendships")
      .delete()
      .or(`user_id.eq.${uid},friend_id.eq.${uid}`);
    await supabase.from("notifications").delete().eq("user_id", uid);
    await supabase
      .from("tenant_reviews")
      .delete()
      .or(`reviewer_id.eq.${uid},reviewee_id.eq.${uid}`);
    await supabase
      .from("reviews")
      .delete()
      .or(`reviewer_id.eq.${uid},reviewee_id.eq.${uid}`);
    await supabase
      .from("messages")
      .delete()
      .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`);
    await supabase.from("transactions").delete().eq("user_id", uid);
    await supabase.from("subscriptions").delete().eq("user_id", uid);
    await supabase.from("saved_searches").delete().eq("user_id", uid);
    await supabase.from("wishlists").delete().eq("user_id", uid);
    await supabase.from("bookings").delete().eq("user_id", uid);
    await supabase.from("properties").delete().eq("lister_id", uid);
    await supabase.from("profiles").delete().eq("id", uid);

    // Edge function uses the service role key to delete the auth.users row.
    // If it isn't deployed yet, the cascade above still removes all app data;
    // the lingering auth row will get cleaned up when the function ships.
    try {
      await supabase.functions.invoke("delete-account");
    } catch (err) {
      console.warn("[deleteAccount] edge function failed (continuing):", err);
    }

    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }, [supabase, user, router]);

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
      deleteAccount,
      refreshProfile,
    }),
    [
      session,
      user,
      profile,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      deleteAccount,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
