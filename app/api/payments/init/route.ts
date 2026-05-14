import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plans";

interface InitBody {
  planId: string;
  amount: number;       // amount in the chosen currency
  currency: string;     // e.g. "GBP", "NGN", "USD"
  phone?: string;
}

export async function POST(request: NextRequest) {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "FLUTTERWAVE_SECRET_KEY is not configured." },
      { status: 500 }
    );
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: InitBody;
  try {
    body = (await request.json()) as InitBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const plan = getPlan(body.planId);
  if (!plan) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }
  if (!body.amount || !body.currency) {
    return NextResponse.json(
      { error: "Missing amount or currency." },
      { status: 400 }
    );
  }

  // Build a unique tx_ref per the mobile app's convention.
  const reference = `SUB_${Date.now()}_${user.id.substring(0, 8)}`;
  const origin = request.nextUrl.origin;

  const paymentData = {
    tx_ref: reference,
    amount: body.amount,
    currency: body.currency,
    redirect_url: `${origin}/payment-callback`,
    payment_options: "card,banktransfer,ussd",
    customer: {
      email: user.email,
      name: (user.user_metadata?.name as string | undefined) ?? user.email,
      phonenumber: body.phone ?? "",
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
  };

  const flwRes = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(paymentData),
  });

  const result = await flwRes.json();
  if (result.status !== "success" || !result.data?.link) {
    return NextResponse.json(
      { error: result.message || "Failed to initialize payment." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    link: result.data.link as string,
    reference,
  });
}
