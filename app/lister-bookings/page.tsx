"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/currency";
import { propertyHref } from "@/lib/slug";

interface Row {
  id: string;
  property_id: string;
  user_id: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  currency: string;
  status: string;
  special_requests: string | null;
  created_at: string;
  property?: { id: string; title: string } | null;
  guest?: { name: string | null } | null;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  confirmed: "default",
  completed: "secondary",
  cancelled: "destructive",
};

export default function ListerBookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/lister-bookings")}`);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data: props } = await supabase
      .from("properties")
      .select("id, title")
      .eq("lister_id", user.id);
    const properties = ((props ?? []) as Array<{ id: string; title: string }>);
    const propMap = new Map(properties.map((p) => [p.id, p]));
    const propIds = properties.map((p) => p.id);
    if (!propIds.length) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .in("property_id", propIds)
      .order("created_at", { ascending: false });
    const bookings = ((data ?? []) as Row[]);
    const userIds = [...new Set(bookings.map((b) => b.user_id))];
    const guestMap = new Map<string, { name: string | null }>();
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);
      ((profiles ?? []) as Array<{ id: string; name: string | null }>).forEach(
        (p) => guestMap.set(p.id, { name: p.name })
      );
    }
    setRows(
      bookings.map((b) => ({
        ...b,
        property: propMap.get(b.property_id) ?? null,
        guest: guestMap.get(b.user_id) ?? null,
      }))
    );
    setLoading(false);
  }

  async function updateStatus(
    id: string,
    next: "confirmed" | "cancelled" | "completed"
  ) {
    setBusyId(id);
    const patch: Record<string, unknown> = {
      status: next,
      updated_at: new Date().toISOString(),
    };
    if (next === "cancelled") patch.cancelled_at = new Date().toISOString();
    const { error } = await supabase.from("bookings").update(patch).eq("id", id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));
      toast.success(`Marked ${next}.`);
    }
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

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-2xl font-bold flex-1">Property bookings</h1>
        </div>

        {rows.length === 0 ? (
          <Card className="p-10 text-center space-y-3">
            <Calendar className="size-12 mx-auto text-muted-foreground" />
            <div className="font-medium">No bookings yet</div>
            <p className="text-sm text-muted-foreground">
              When guests book your properties, requests will appear here.
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
                        <div className="font-medium line-clamp-1">
                          {b.property?.title ?? "Property"} · {b.guest?.name ?? "Guest"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(b.check_in), "PP")} → {format(new Date(b.check_out), "PP")}
                          {b.guests ? ` · ${b.guests} guest${b.guests === 1 ? "" : "s"}` : ""}
                        </div>
                      </div>
                      <Badge variant={statusVariant[b.status] ?? "outline"} className="capitalize">
                        {b.status}
                      </Badge>
                    </div>
                    {b.special_requests && (
                      <p className="text-sm text-muted-foreground italic">
                        Note: {b.special_requests}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      {b.property && (
                        <Link
                          href={propertyHref({ id: b.property.id, title: b.property.title })}
                          className="text-primary hover:underline"
                        >
                          View property
                        </Link>
                      )}
                      <span className="font-semibold text-primary">
                        {formatPrice(Number(b.total_price), b.currency)}
                      </span>
                    </div>
                    {b.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => updateStatus(b.id, "confirmed")}
                          className="flex-1"
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => updateStatus(b.id, "cancelled")}
                          className="flex-1"
                        >
                          Decline
                        </Button>
                      </div>
                    )}
                    {b.status === "confirmed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => updateStatus(b.id, "completed")}
                      >
                        Mark completed
                      </Button>
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
