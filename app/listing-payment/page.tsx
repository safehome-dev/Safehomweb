"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { LISTING_PLANS, type ListingPlan } from "@/lib/plans";
import { useAuth } from "@/lib/providers/auth-provider";
import { useCurrency } from "@/lib/providers/currency-provider";
import {
  convertFromCurrency,
  CURRENCY_SYMBOLS,
  formatPrice,
} from "@/lib/currency";
import {
  FLUTTERWAVE_INLINE_SRC,
  type FlutterwaveCallbackData,
} from "@/lib/flutterwave";

export default function ListingPaymentPage() {
  return (
    <Suspense fallback={null}>
      <ListingPaymentInner />
    </Suspense>
  );
}

function ListingPaymentInner() {
  const { user, profile, loading: authLoading } = useAuth();
  const { currencies, rates, display } = useCurrency();
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("returnTo") ?? "/listings/new";

  const [selectedCurrency, setSelectedCurrency] = useState<string>("GBP");
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  // Guard so we don't double-fire when both `callback` and `onclose` run.
  const verifyingRef = useRef<string | null>(null);

  useEffect(() => {
    if (profile?.preferred_currency) {
      setSelectedCurrency(profile.preferred_currency);
    } else if (display) {
      setSelectedCurrency(display);
    }
  }, [profile?.preferred_currency, display]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent("/listing-payment")}`);
    }
  }, [user, authLoading, router]);

  const priceForPlan = useMemo(
    () => (plan: ListingPlan) => {
      const converted = convertFromCurrency(plan.price, "GBP", selectedCurrency, rates);
      return Math.max(1, Math.round(converted));
    },
    [selectedCurrency, rates]
  );

  async function verifyPayment(
    planId: string,
    reference: string,
    transactionId?: number | string
  ) {
    if (verifyingRef.current === reference) return;
    verifyingRef.current = reference;
    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, planId, transactionId }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("Subscription activated");
        router.replace(returnTo);
      } else if (data?.status === "cancelled") {
        toast.error("Payment was cancelled.");
      } else {
        toast.error(data?.error ?? "Payment could not be verified.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not verify payment. Please contact support.");
    } finally {
      setProcessingPlan(null);
    }
  }

  function subscribe(plan: ListingPlan) {
    if (!user || !user.email) {
      router.push("/login");
      return;
    }
    const publicKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY;
    if (!publicKey) {
      toast.error("Payment is not configured. Please contact support.");
      return;
    }
    if (typeof window === "undefined" || !window.FlutterwaveCheckout) {
      toast.error("Payment widget hasn't loaded yet. Try again in a moment.");
      return;
    }
    const amount = priceForPlan(plan);
    const reference = `SUB_${Date.now()}_${user.id.substring(0, 8)}`;

    setProcessingPlan(plan.id);
    verifyingRef.current = null;

    window.FlutterwaveCheckout({
      public_key: publicKey,
      tx_ref: reference,
      amount,
      currency: selectedCurrency,
      payment_options: "card,banktransfer,ussd",
      customer: {
        email: user.email,
        name:
          (user.user_metadata?.name as string | undefined) ??
          profile?.name ??
          user.email,
        phone_number: profile?.phone ?? "",
      },
      customizations: {
        title: plan.name,
        description: plan.description,
      },
      meta: {
        plan_id: plan.id,
        plan_name: plan.name,
        user_id: user.id,
        duration_days: plan.durationDays,
      },
      callback: (data: FlutterwaveCallbackData) => {
        // FW's inline modal doesn't auto-close — dismiss it ourselves before
        // we kick off verification.
        if (typeof window !== "undefined" && window.closePaymentModal) {
          try {
            window.closePaymentModal();
          } catch {
            /* ignore */
          }
        }
        // Always verify server-side. Server handles success / cancelled / failed
        // and writes the matching `transactions` row.
        void verifyPayment(plan.id, data.tx_ref || reference, data.transaction_id);
      },
      onclose: () => {
        // If the user closes the modal without paying, callback never fires.
        // Reset the button state and write a cancelled transaction so we have
        // a record.
        if (!verifyingRef.current) {
          verifyingRef.current = reference;
          fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference, planId: plan.id }),
          }).catch(() => {});
          setProcessingPlan(null);
        }
      },
    });
  }

  if (authLoading || !user) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          Loading…
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <Script
        src={FLUTTERWAVE_INLINE_SRC}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
      />

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto size-16 rounded-full bg-accent grid place-items-center">
            <Rocket className="size-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Choose Your Plan</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Select a subscription plan to start listing your properties.
          </p>
        </div>

        <Card className="p-5 max-w-md mx-auto space-y-2">
          <label className="text-sm font-medium">Pay in</label>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.length === 0 ? (
                <SelectItem value="GBP">GBP — British Pound</SelectItem>
              ) : (
                currencies.map((c) => (
                  <SelectItem key={c.id} value={c.currency_code}>
                    {CURRENCY_SYMBOLS[c.currency_code] ?? c.currency_code}{" "}
                    {c.currency_code} — {c.currency_name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedCurrency !== "GBP" && (
            <p className="text-xs text-muted-foreground italic">
              Prices converted from GBP at the current exchange rate.
            </p>
          )}
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {LISTING_PLANS.map((plan) => {
            const isProcessing = processingPlan === plan.id;
            const amount = priceForPlan(plan);
            return (
              <Card
                key={plan.id}
                className={`relative p-6 space-y-4 border-2 ${
                  plan.popular ? "border-primary" : "border-border"
                }`}
              >
                <div className="absolute top-4 right-4 flex gap-2">
                  {plan.popular && (
                    <Badge className="bg-primary text-primary-foreground">POPULAR</Badge>
                  )}
                  {plan.recommended && (
                    <Badge className="bg-success text-white">RECOMMENDED</Badge>
                  )}
                </div>

                <div className="space-y-1 pr-28">
                  <h2 className="text-xl font-bold">{plan.name}</h2>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  {plan.perDay && selectedCurrency === "GBP" && (
                    <p className="text-xs font-semibold text-amber-600">
                      {plan.perDay}
                    </p>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    {formatPrice(amount, selectedCurrency)}
                  </span>
                  <span className="text-sm text-muted-foreground">/ {plan.duration}</span>
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="size-4 text-success shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "secondary"}
                  disabled={isProcessing || !!processingPlan || !scriptReady}
                  onClick={() => subscribe(plan)}
                >
                  {isProcessing && <Loader2 className="size-4 animate-spin" />}
                  {isProcessing
                    ? "Opening checkout…"
                    : !scriptReady
                      ? "Loading payment…"
                      : "Subscribe Now"}
                </Button>
              </Card>
            );
          })}
        </div>

        <div className="text-center text-xs text-muted-foreground pt-6 space-y-2">
          <p>
            All plans grant access during the subscription period. Payments are
            processed securely by Flutterwave.
          </p>
          <p className="space-x-2">
            <Link href="/terms-of-service" className="text-primary underline">
              Terms of Service
            </Link>
            <span>·</span>
            <Link href="/privacy-policy" className="text-primary underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </SiteShell>
  );
}
