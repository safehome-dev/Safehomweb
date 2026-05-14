"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, CreditCard, Loader2, Receipt } from "lucide-react";

import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSubscriptionActive } from "@/lib/subscription";
import { formatPrice } from "@/lib/currency";
import type { Subscription } from "@/lib/types/database";

interface TransactionRow {
  id: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  payment_reference: string | null;
  payment_status: string | null;
  created_at: string | null;
}

export default function SubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Subscription | null>(null);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/subscription")}`);
      return;
    }
    (async () => {
      const [subRes, txRes] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("transactions")
          .select("id, amount, currency, payment_method, payment_reference, payment_status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      setActive((subRes.data as Subscription | null) ?? null);
      setTransactions((txRes.data ?? []) as unknown as TransactionRow[]);
      setLoading(false);
    })();
  }, [user, authLoading, router, supabase]);

  if (authLoading || loading) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin mx-auto mb-2" />
          Loading subscription…
        </div>
      </SiteShell>
    );
  }

  const activeNow = isSubscriptionActive(active);

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Subscription</h1>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className={`size-12 rounded-lg grid place-items-center ${
                activeNow ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
              }`}
            >
              <CreditCard className="size-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">
                  {active?.plan_type ?? "No plan"}
                </h2>
                <Badge variant={activeNow ? "default" : "secondary"}>
                  {activeNow ? "Active" : active?.status ?? "None"}
                </Badge>
              </div>
              {active?.expires_at && (
                <div className="text-sm text-muted-foreground inline-flex items-center gap-1 mt-1">
                  <CalendarClock className="size-3.5" />
                  {activeNow ? "Renews" : "Expired"}{" "}
                  {new Date(active.expires_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              )}
            </div>
          </div>

          {activeNow ? (
            <div className="rounded-lg border bg-success/5 p-3 text-sm flex items-start gap-2">
              <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
              <span>You can create property listings while this subscription is active.</span>
            </div>
          ) : (
            <Link href="/listing-payment">
              <Button className="w-full">Choose a plan</Button>
            </Link>
          )}
        </Card>

        <section>
          <h2 className="font-semibold mb-3 inline-flex items-center gap-2">
            <Receipt className="size-4" /> Recent transactions
          </h2>
          {transactions.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              No transactions yet.
            </Card>
          ) : (
            <ul className="space-y-2">
              {transactions.map((t) => (
                <li key={t.id}>
                  <Card className="p-3 flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <div className="font-medium">
                        {formatPrice(Number(t.amount), t.currency)}{" "}
                        <span className="text-muted-foreground font-normal">
                          via {t.payment_method ?? "—"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {t.payment_reference ?? "—"} ·{" "}
                        {t.created_at
                          ? new Date(t.created_at).toLocaleString()
                          : ""}
                      </div>
                    </div>
                    <Badge
                      variant={
                        t.payment_status === "successful"
                          ? "default"
                          : t.payment_status === "cancelled"
                            ? "secondary"
                            : "destructive"
                      }
                      className="capitalize"
                    >
                      {t.payment_status ?? "pending"}
                    </Badge>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </SiteShell>
  );
}
