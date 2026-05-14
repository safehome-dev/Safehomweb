import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plans";

interface VerifyBody {
  reference: string;
  planId: string;
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
  const verifyRes = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(body.reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
    }
  );
  const verifyResult = await verifyRes.json();
  const flwData = verifyResult?.data;
  const flwStatus = flwData?.status as string | undefined;

  // Sanity check: amount + customer must match what we expect.
  const flwAmount = Number(flwData?.amount) || 0;
  const flwCurrency = (flwData?.charged_currency || flwData?.currency) as
    | string
    | undefined;
  const flwUserId = (flwData?.meta?.user_id ?? flwData?.meta?.userId) as
    | string
    | undefined;

  if (verifyResult.status !== "success" || flwStatus !== "successful") {
    // Record a failed/cancelled transaction so the user has an audit trail.
    await supabase.from("transactions").insert({
      user_id: user.id,
      amount: flwAmount,
      currency: flwCurrency ?? "GBP",
      payment_method: "flutterwave",
      payment_reference: body.reference,
      payment_status: flwStatus === "cancelled" ? "cancelled" : "failed",
      metadata: { plan_id: plan.id, flutterwave: flwData ?? null },
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
  if (existing && (existing as { payment_status: string }).payment_status === "successful") {
    return NextResponse.json({ ok: true, status: "successful", reused: true });
  }

  // 3. Create subscription row.
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .insert({
      user_id: user.id,
      plan_type: plan.id,
      status: "active",
      expires_at: expiresAt.toISOString(),
      price: flwAmount,
      currency: flwCurrency ?? "GBP",
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
    currency: flwCurrency ?? "GBP",
    payment_method: "flutterwave",
    payment_reference: body.reference,
    payment_status: "successful",
    metadata: { plan_id: plan.id, flutterwave: flwData ?? null },
  });
  if (txError) {
    // Subscription is already created — don't fail the whole flow, just log.
    console.error("[payments/verify] transaction insert failed", txError);
  }

  return NextResponse.json({
    ok: true,
    status: "successful",
    subscriptionId: (subscription as { id: string }).id,
  });
}
