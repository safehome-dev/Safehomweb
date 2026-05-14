"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CreditCard, Loader2, Lock, Sparkles } from "lucide-react";

import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSubscriptionActive } from "@/lib/subscription";
import type { Subscription } from "@/lib/types/database";

export default function NewListingPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [checking, setChecking] = useState(true);
  const [active, setActive] = useState<Subscription | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/listings/new")}`);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const sub = (data as Subscription | null) ?? null;
      if (isSubscriptionActive(sub)) {
        setActive(sub);
      } else {
        // Hard redirect — mirror mobile gate.
        router.replace(
          `/listing-payment?returnTo=${encodeURIComponent("/listings/new")}`
        );
        return;
      }
      setChecking(false);
    })();
  }, [user, authLoading, router, supabase]);

  if (authLoading || checking) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin mx-auto mb-2" />
          Checking your subscription…
        </div>
      </SiteShell>
    );
  }

  // Only render this if a subscription is active. Web doesn't yet have the
  // full create-listing form (that's the next slice of work) — this is the
  // success landing point after payment.
  const userType = profile?.user_type ?? "renter";
  const canList =
    userType === "lister" || userType === "both" || profile?.role === "admin";

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-10 max-w-2xl space-y-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-lg bg-success/10 grid place-items-center">
              <Sparkles className="size-6 text-success" />
            </div>
            <div>
              <h1 className="text-xl font-bold">You&apos;re ready to list</h1>
              <p className="text-sm text-muted-foreground">
                Active plan:{" "}
                <span className="font-medium text-foreground">
                  {active?.plan_type ?? "—"}
                </span>
                {active?.expires_at && (
                  <>
                    {" "}
                    · expires{" "}
                    {new Date(active.expires_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </>
                )}
              </p>
            </div>
          </div>

          {!canList && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 flex gap-3">
              <Lock className="size-5 shrink-0" />
              <div>
                Your account is set as <strong>{userType}</strong>. To publish
                listings, switch your role to <strong>lister</strong> or{" "}
                <strong>both</strong> in your profile.
                <div className="mt-2">
                  <Link href="/profile/edit">
                    <Button size="sm" variant="outline">
                      Update profile
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            The full create-listing form is still being built on the web. In the
            meantime you can manage your existing listings or your subscription:
          </p>

          <div className="flex flex-wrap gap-2">
            <Link href="/subscription">
              <Button variant="outline" className="gap-2">
                <CreditCard className="size-4" /> Subscription
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Back to home</Button>
            </Link>
          </div>
        </Card>
      </div>
    </SiteShell>
  );
}
