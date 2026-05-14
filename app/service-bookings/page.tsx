"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Check, ClipboardList, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/currency";

interface RequestRow {
  id: string;
  service_type: string;
  service_description: string;
  booking_date: string;
  booking_time: string | null;
  duration_hours: number | null;
  service_location: string;
  city: string;
  quoted_price: number | null;
  currency: string;
  status: string;
  customer_id: string;
  customer_notes: string | null;
  customer_name?: string | null;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  accepted: "default",
  rejected: "destructive",
  "in-progress": "default",
  completed: "secondary",
  cancelled: "destructive",
};

export default function ServiceBookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/service-bookings")}`);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data: provider } = await supabase
      .from("service_providers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    const pid = (provider as { id: string } | null)?.id ?? null;
    setProviderId(pid);
    if (!pid) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("service_bookings")
      .select("*")
      .eq("provider_id", pid)
      .order("created_at", { ascending: false });
    const bookings = (data ?? []) as RequestRow[];
    const customerIds = [...new Set(bookings.map((b) => b.customer_id))];
    const customerMap = new Map<string, string | null>();
    if (customerIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", customerIds);
      ((profiles ?? []) as Array<{ id: string; name: string | null }>).forEach(
        (p) => customerMap.set(p.id, p.name)
      );
    }
    setRows(
      bookings.map((b) => ({ ...b, customer_name: customerMap.get(b.customer_id) ?? null }))
    );
    setLoading(false);
  }

  async function updateStatus(
    id: string,
    next: "accepted" | "rejected" | "in-progress" | "completed"
  ) {
    setBusyId(id);
    const patch: Record<string, unknown> = { status: next, updated_at: new Date().toISOString() };
    if (next === "accepted") patch.accepted_at = new Date().toISOString();
    if (next === "completed") patch.completed_at = new Date().toISOString();
    const { error } = await supabase.from("service_bookings").update(patch).eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));
    toast.success(`Marked ${next}.`);
  }

  if (authLoading || loading) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin mx-auto mb-2" /> Loading…
        </div>
      </SiteShell>
    );
  }

  if (!providerId) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-10 max-w-md">
          <Card className="p-6 text-center space-y-4">
            <ClipboardList className="size-12 mx-auto text-muted-foreground" />
            <div>
              <h1 className="text-xl font-bold">Not a service provider yet</h1>
              <p className="text-sm text-muted-foreground">
                Create a service profile to receive booking requests.
              </p>
            </div>
            <Link href="/create-service-provider">
              <Button>Become a service provider</Button>
            </Link>
          </Card>
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
          <h1 className="text-2xl font-bold flex-1">Service requests</h1>
        </div>

        {rows.length === 0 ? (
          <Card className="p-10 text-center space-y-3">
            <ClipboardList className="size-12 mx-auto text-muted-foreground" />
            <div className="font-medium">No requests yet</div>
            <p className="text-sm text-muted-foreground">
              When customers book your services, they&apos;ll show up here.
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {rows.map((b) => {
              const busy = busyId === b.id;
              return (
                <li key={b.id}>
                  <Card className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium capitalize line-clamp-1">
                          {b.service_type} · {b.customer_name ?? "Customer"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(b.booking_date), "PP")}
                          {b.booking_time ? ` · ${b.booking_time}` : ""}
                          {b.duration_hours ? ` · ${b.duration_hours}h` : ""}
                        </div>
                      </div>
                      <Badge
                        variant={statusVariant[b.status] ?? "outline"}
                        className="capitalize"
                      >
                        {b.status}
                      </Badge>
                    </div>
                    <p className="text-sm whitespace-pre-line">{b.service_description}</p>
                    {b.customer_notes && (
                      <p className="text-xs text-muted-foreground italic">
                        Note: {b.customer_notes}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1 text-sm">
                      <span className="text-muted-foreground">📍 {b.service_location}, {b.city}</span>
                      {b.quoted_price ? (
                        <span className="font-semibold text-primary">
                          {formatPrice(Number(b.quoted_price), b.currency)}
                        </span>
                      ) : null}
                    </div>

                    {(b.status === "pending" || b.status === "accepted") && (
                      <div className="flex items-center gap-2 pt-2">
                        {b.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() => updateStatus(b.id, "accepted")}
                              className="flex-1 gap-1"
                            >
                              <Check className="size-4" /> Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => updateStatus(b.id, "rejected")}
                              className="flex-1 gap-1"
                            >
                              <X className="size-4" /> Reject
                            </Button>
                          </>
                        )}
                        {b.status === "accepted" && (
                          <>
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() => updateStatus(b.id, "in-progress")}
                              className="flex-1"
                            >
                              Start job
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => updateStatus(b.id, "completed")}
                              className="flex-1"
                            >
                              Mark completed
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SiteShell>
  );
}
