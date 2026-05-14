"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";

import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/currency";

interface BookingRow {
  id: string;
  service_type: string;
  service_description: string;
  booking_date: string;
  booking_time: string | null;
  service_location: string;
  city: string;
  quoted_price: number | null;
  final_price: number | null;
  currency: string;
  status: string;
  payment_status: string | null;
  provider_id: string;
  provider_business?: string | null;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  accepted: "default",
  rejected: "destructive",
  "in-progress": "default",
  completed: "secondary",
  cancelled: "destructive",
  disputed: "destructive",
};

export default function MyServiceBookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/my-service-bookings")}`);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("service_bookings")
        .select("*")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });
      const bookings = (data ?? []) as BookingRow[];
      const providerIds = [...new Set(bookings.map((b) => b.provider_id))];
      const providerMap = new Map<string, string>();
      if (providerIds.length) {
        const { data: providers } = await supabase
          .from("service_providers")
          .select("id, business_name")
          .in("id", providerIds);
        ((providers ?? []) as Array<{ id: string; business_name: string }>).forEach(
          (p) => providerMap.set(p.id, p.business_name)
        );
      }
      setRows(
        bookings.map((b) => ({
          ...b,
          provider_business: providerMap.get(b.provider_id) ?? null,
        }))
      );
      setLoading(false);
    })();
  }, [user, authLoading, router, supabase]);

  if (authLoading || loading) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin mx-auto mb-2" /> Loading…
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-2xl font-bold flex-1">My service bookings</h1>
          <Link href="/services">
            <Button size="sm" variant="outline">Browse services</Button>
          </Link>
        </div>

        {rows.length === 0 ? (
          <Card className="p-10 text-center space-y-3">
            <Calendar className="size-12 mx-auto text-muted-foreground" />
            <div className="font-medium">No service bookings yet</div>
            <Link href="/services"><Button>Browse services</Button></Link>
          </Card>
        ) : (
          <ul className="space-y-3">
            {rows.map((b) => (
              <li key={b.id}>
                <Card className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium capitalize line-clamp-1">
                        {b.service_type} · {b.provider_business ?? "Provider"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(b.booking_date), "PP")}
                        {b.booking_time ? ` · ${b.booking_time}` : ""}
                      </div>
                    </div>
                    <Badge
                      variant={statusVariant[b.status] ?? "outline"}
                      className="capitalize"
                    >
                      {b.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {b.service_description}
                  </p>
                  <div className="flex items-center justify-between pt-1 text-sm">
                    <span className="text-muted-foreground">
                      📍 {b.city}
                    </span>
                    {(b.final_price ?? b.quoted_price) ? (
                      <span className="font-semibold text-primary">
                        {formatPrice(Number(b.final_price ?? b.quoted_price), b.currency)}
                      </span>
                    ) : null}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SiteShell>
  );
}
