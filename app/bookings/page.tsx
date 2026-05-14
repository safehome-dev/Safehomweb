"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Calendar,
  CalendarCheck2,
  CalendarClock,
  CalendarX,
  CheckCircle2,
  Loader2,
  MapPin,
  Moon,
  RefreshCw,
  Star,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useAuth } from "@/lib/providers/auth-provider";
import { useCurrency } from "@/lib/providers/currency-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/currency";
import { propertyHref } from "@/lib/slug";

interface Booking {
  id: string;
  property_id: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  currency: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  created_at: string;
  property: {
    id: string;
    title: string;
    location_city: string;
    location_country: string;
  } | null;
}

type Filter = "all" | "pending" | "confirmed" | "completed" | "cancelled";

const STATUS_META: Record<
  Booking["status"],
  { label: string; icon: React.ElementType; tone: string }
> = {
  pending: {
    label: "Pending",
    icon: CalendarClock,
    tone: "bg-amber-100 text-amber-800",
  },
  confirmed: {
    label: "Confirmed",
    icon: CalendarCheck2,
    tone: "bg-emerald-100 text-emerald-800",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    tone: "bg-blue-100 text-blue-800",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    tone: "bg-red-100 text-red-700",
  },
};

function calculateNights(checkIn: string, checkOut: string) {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return Math.max(1, Math.ceil((b - a) / (1000 * 60 * 60 * 24)));
}

export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { convert, display } = useCurrency();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select(
        `id, property_id, check_in, check_out, guests, total_price, currency, status, created_at,
         property:properties (id, title, location_city, location_country)`
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setBookings((data ?? []) as unknown as Booking[]);
    setLoading(false);
  }

  async function cancelBooking() {
    if (!cancelId) return;
    setCancelling(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", cancelId);
    setCancelling(false);
    setCancelId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBookings((prev) =>
      prev.map((b) => (b.id === cancelId ? { ...b, status: "cancelled" } : b))
    );
    toast.success("Booking cancelled.");
  }

  const stats = useMemo(
    () => ({
      total: bookings.length,
      pending: bookings.filter((b) => b.status === "pending").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      completed: bookings.filter((b) => b.status === "completed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    }),
    [bookings]
  );

  const filtered = useMemo(
    () =>
      filter === "all" ? bookings : bookings.filter((b) => b.status === filter),
    [filter, bookings]
  );

  if (!user && !authLoading) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 max-w-md">
          <Card className="p-10 text-center space-y-3">
            <Calendar className="size-12 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-semibold">Sign in to view bookings</h1>
            <Link href="/login">
              <Button>Sign in</Button>
            </Link>
          </Card>
        </div>
      </SiteShell>
    );
  }

  const filters: Array<{ id: Filter; label: string; count: number }> = [
    { id: "all", label: "All", count: stats.total },
    { id: "confirmed", label: "Confirmed", count: stats.confirmed },
    { id: "pending", label: "Pending", count: stats.pending },
    { id: "completed", label: "Completed", count: stats.completed },
    { id: "cancelled", label: "Cancelled", count: stats.cancelled },
  ];

  return (
    <SiteShell>
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">My bookings</h1>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => load()}
            aria-label="Refresh"
            className="text-primary"
          >
            <RefreshCw className="size-5" />
          </Button>
        </div>
        <div className="container mx-auto px-4 pb-3 -mt-1 flex gap-2 overflow-x-auto">
          {filters.map(({ id, label, count }) => {
            const active = filter === id;
            return (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-3xl space-y-3">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center space-y-3">
            <Calendar className="size-12 mx-auto text-muted-foreground" />
            <h2 className="font-semibold">No bookings</h2>
            <p className="text-sm text-muted-foreground">
              {filter === "all"
                ? "You haven't made any bookings yet."
                : `No ${filter} bookings.`}
            </p>
            <Link href="/">
              <Button>Explore properties</Button>
            </Link>
          </Card>
        ) : (
          filtered.map((b) => {
            const meta = STATUS_META[b.status];
            const Icon = meta.icon;
            const nights = calculateNights(b.check_in, b.check_out);
            const priceTarget = convert(Number(b.total_price), b.currency);
            return (
              <Card key={b.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={
                      b.property
                        ? propertyHref({ id: b.property.id, title: b.property.title })
                        : `/property/${b.property_id}`
                    }
                    className="font-semibold text-base line-clamp-1 hover:underline flex-1"
                  >
                    {b.property?.title ?? "Property"}
                  </Link>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.tone}`}
                  >
                    <Icon className="size-3.5" />
                    {meta.label}
                  </span>
                </div>
                {b.property && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {b.property.location_city}, {b.property.location_country}
                  </div>
                )}

                <div className="border-t pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <Detail icon={CalendarClock} label="Check-in" value={format(new Date(b.check_in), "PP")} />
                  <Detail icon={CalendarX} label="Check-out" value={format(new Date(b.check_out), "PP")} />
                  <Detail icon={Moon} label="Nights" value={String(nights)} />
                  <Detail icon={Users} label="Guests" value={String(b.guests ?? 1)} />
                </div>

                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-xl font-bold text-primary">
                    {formatPrice(priceTarget, display)}
                  </span>
                  {b.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCancelId(b.id)}
                      className="border-destructive text-destructive hover:bg-destructive/10"
                    >
                      Cancel
                    </Button>
                  )}
                  {b.status === "completed" && (
                    <Link
                      href={`/write-review?propertyId=${b.property_id}&bookingId=${b.id}`}
                    >
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <Star className="size-4" /> Write Review
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Dialog
        open={!!cancelId}
        onOpenChange={(o) => !cancelling && !o && setCancelId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel booking?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={cancelling}
              onClick={() => setCancelId(null)}
            >
              No
            </Button>
            <Button
              variant="destructive"
              disabled={cancelling}
              onClick={cancelBooking}
            >
              {cancelling ? "Cancelling…" : "Yes, cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SiteShell>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-semibold line-clamp-1">{value}</div>
      </div>
    </div>
  );
}
