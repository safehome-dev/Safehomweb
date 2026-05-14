"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle, AlertTriangle } from "lucide-react";

import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Status = "verifying" | "success" | "cancelled" | "failed" | "error";

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={null}>
      <PaymentCallbackInner />
    </Suspense>
  );
}

function PaymentCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState<string>("Verifying your payment…");
  const [reference, setReference] = useState<string | null>(null);
  const [returnTo, setReturnTo] = useState<string>("/listings/new");

  useEffect(() => {
    const tx_ref = params.get("tx_ref") ?? params.get("transaction_id");
    const fwStatus = params.get("status");
    setReference(tx_ref);

    // Recover the plan id + returnTo we stashed before redirecting.
    let planId: string | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = window.sessionStorage.getItem("safehome:pending-payment");
        if (raw) {
          const parsed = JSON.parse(raw) as { planId?: string; returnTo?: string };
          planId = parsed.planId ?? null;
          if (parsed.returnTo) setReturnTo(parsed.returnTo);
        }
      } catch {
        /* ignore */
      }
    }

    if (!tx_ref) {
      setStatus("error");
      setMessage("Missing transaction reference. Please contact support.");
      return;
    }

    if (fwStatus === "cancelled") {
      setStatus("cancelled");
      setMessage("Payment was cancelled. You can try again any time.");
      // Still log it server-side so we have an audit trail.
      if (planId) {
        void fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: tx_ref, planId }),
        });
      }
      return;
    }

    if (!planId) {
      setStatus("error");
      setMessage(
        "We lost track of the plan you were paying for. Please contact support with reference " +
          tx_ref
      );
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: tx_ref, planId }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          setStatus("success");
          setMessage(
            "Your subscription is now active. You can start listing properties."
          );
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem("safehome:pending-payment");
          }
        } else {
          setStatus(data.status === "cancelled" ? "cancelled" : "failed");
          setMessage(
            data.error ?? "Your payment could not be verified. Please try again."
          );
        }
      } catch (err) {
        console.error(err);
        setStatus("error");
        setMessage("Something went wrong verifying your payment.");
      }
    })();
  }, [params]);

  const icon =
    status === "verifying" ? (
      <Loader2 className="size-12 text-primary animate-spin" />
    ) : status === "success" ? (
      <CheckCircle2 className="size-12 text-success" />
    ) : status === "cancelled" ? (
      <AlertTriangle className="size-12 text-amber-500" />
    ) : (
      <XCircle className="size-12 text-destructive" />
    );

  const title =
    status === "verifying"
      ? "Verifying payment"
      : status === "success"
        ? "Payment successful"
        : status === "cancelled"
          ? "Payment cancelled"
          : status === "failed"
            ? "Payment failed"
            : "Something went wrong";

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-16 max-w-md">
        <Card className="p-8 text-center space-y-4">
          <div className="flex justify-center">{icon}</div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
          {reference && (
            <p className="text-xs text-muted-foreground">
              Reference: <code>{reference}</code>
            </p>
          )}

          <div className="flex flex-col gap-2 pt-2">
            {status === "success" && (
              <Button onClick={() => router.replace(returnTo)} className="w-full">
                Continue
              </Button>
            )}
            {(status === "failed" || status === "cancelled" || status === "error") && (
              <Button
                onClick={() => router.replace("/listing-payment")}
                className="w-full"
              >
                Try again
              </Button>
            )}
            <Link href="/">
              <Button variant="outline" className="w-full">
                Back to home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </SiteShell>
  );
}
