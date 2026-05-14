import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getPlan, type ListingPlan } from "@/lib/plans";

interface VerifyBody {
  reference: string;
  planId: string;
  /** Transaction id Flutterwave returned in the inline `callback(data)`. */
  transactionId?: number | string;
}

// DB CHECK constraints (read-only — do not relax these without DB changes):
//   subscriptions.plan_type IN ('free','weekly','monthly','yearly')
//   subscriptions.currency  IN ('GBP','NGN','USD')
//   subscriptions.status    IN ('active','cancelled','expired')
//   transactions.currency       IN ('GBP','NGN','USD')
//   transactions.payment_status IN ('pending','successful','failed','refunded','cancelled')
// Our plan IDs are richer than the DB enum, so we map them. The original
// plan id is preserved in transactions.metadata.plan_id for audit.
function dbPlanType(plan: ListingPlan): "free" | "weekly" | "monthly" | "yearly" {
  switch (plan.id) {
    case "weekly":
      return "weekly";
    case "standard-monthly":
    case "premium":
      return "monthly";
    case "landlord-single":
      return "yearly";
    default:
      return "free";
  }
}

const ALLOWED_CURRENCIES = new Set(["GBP", "NGN", "USD"]);
function dbCurrency(currency: string | undefined): string {
  return currency && ALLOWED_CURRENCIES.has(currency) ? currency : "GBP";
}

type TxStatus = "successful" | "failed" | "pending" | "refunded" | "cancelled";
function dbPaymentStatus(flwStatus: string | undefined): TxStatus {
  if (flwStatus === "successful" || flwStatus === "completed") return "successful";
  if (flwStatus === "pending") return "pending";
  if (flwStatus === "cancelled") return "cancelled";
  return "failed";
}

export async function POST(request: NextRequest) {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "FLUTTERWAVE_SECRET_KEY is not configured." },
      { status: 500 }
    );
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated." },
      { status: 401 }
    );
  }

  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }
  if (!body.reference || !body.planId) {
    return NextResponse.json(
      { ok: false, error: "Missing reference or planId." },
      { status: 400 }
    );
  }
  const plan = getPlan(body.planId);
  if (!plan) {
    return NextResponse.json(
      { ok: false, error: "Unknown plan." },
      { status: 400 }
    );
  }

  // 1. Verify with Flutterwave (server-side).
  // Prefer `/v3/transactions/{id}/verify` (works reliably right after the
  // inline `callback`). Fall back to `verify_by_reference` if the client
  // only knows the tx_ref (e.g. for the hosted-redirect fallback page).
  const verifyUrl = body.transactionId
    ? `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(String(body.transactionId))}/verify`
    : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(body.reference)}`;

  const verifyRes = await fetch(verifyUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
  });
  const verifyResult = await verifyRes.json();
  const flwData = verifyResult?.data;
  const flwStatus = flwData?.status as string | undefined;
  const flwAmount = Number(flwData?.amount) || 0;
  const flwCurrencyRaw = (flwData?.charged_currency || flwData?.currency) as
    | string
    | undefined;
  const flwUserId = (flwData?.meta?.user_id ?? flwData?.meta?.userId) as
    | string
    | undefined;

  const isSuccess =
    verifyResult.status === "success" &&
    (flwStatus === "successful" || flwStatus === "completed");

  if (!isSuccess) {
    // Audit row for failed/cancelled. Keep the FW-reported status in metadata
    // so we don't lose nuance even though the DB collapses everything to 'failed'.
    await supabase.from("transactions").insert({
      user_id: user.id,
      amount: flwAmount,
      currency: dbCurrency(flwCurrencyRaw),
      payment_method: "flutterwave",
      payment_reference: body.reference,
      payment_status: dbPaymentStatus(flwStatus),
      metadata: {
        plan_id: plan.id,
        original_currency: flwCurrencyRaw ?? null,
        flw_status: flwStatus ?? null,
        flutterwave: flwData ?? null,
      },
    });
    return NextResponse.json({
      ok: false,
      status: flwStatus ?? "failed",
      error:
        flwStatus === "cancelled"
          ? "Payment was cancelled."
          : "Payment could not be verified.",
    });
  }

  if (flwUserId && flwUserId !== user.id) {
    return NextResponse.json(
      { ok: false, error: "Payment user mismatch." },
      { status: 403 }
    );
  }

  // 2. Idempotency: if we've already persisted this reference, return success.
  const { data: existing } = await supabase
    .from("transactions")
    .select("id, subscription_id, payment_status")
    .eq("payment_reference", body.reference)
    .maybeSingle();
  if (
    existing &&
    (existing as { payment_status: string }).payment_status === "successful"
  ) {
    return NextResponse.json({ ok: true, status: "successful", reused: true });
  }

  // 3. Create subscription row.
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

  const subscriptionCurrency = dbCurrency(flwCurrencyRaw);
  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .insert({
      user_id: user.id,
      plan_type: dbPlanType(plan),
      status: "active",
      expires_at: expiresAt.toISOString(),
      price: flwAmount,
      currency: subscriptionCurrency,
    })
    .select("id")
    .single();

  if (subError || !subscription) {
    return NextResponse.json(
      { ok: false, error: subError?.message ?? "Could not create subscription." },
      { status: 500 }
    );
  }

  // 4. Record the transaction.
  const { error: txError } = await supabase.from("transactions").insert({
    user_id: user.id,
    subscription_id: (subscription as { id: string }).id,
    amount: flwAmount,
    currency: subscriptionCurrency,
    payment_method: "flutterwave",
    payment_reference: body.reference,
    payment_status: "successful",
    metadata: {
      plan_id: plan.id,
      original_currency: flwCurrencyRaw ?? null,
      flutterwave: flwData ?? null,
    },
  });
  if (txError) {
    console.error("[payments/verify] transaction insert failed", txError);
  }

  return NextResponse.json({
    ok: true,
    status: "successful",
    subscriptionId: (subscription as { id: string }).id,
  });
}
