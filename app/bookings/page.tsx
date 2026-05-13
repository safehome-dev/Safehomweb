"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { format } from "date-fns";

import { SiteShell } from "@/components/site-shell";
import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCurrency } from "@/lib/providers/currency-provider";
import { formatPrice } from "@/lib/currency";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface BookingRow {
  id: string;
  property_id: string;
  check_in: string;
  check_out: string;
  total_price: number;
  currency: string;
  status: string;
  created_at: string;
}

export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const { convert, display } = useCurrency();
  const [mine, setMine] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, property_id, check_in, check_out, total_price, currency, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setMine((data ?? []) as unknown as BookingRow[]);
      setLoading(false);
    })();
  }, [user, authLoading, supabase]);

  if (!user && !authLoading) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center space-y-3">
          <h1 className="text-2xl font-semibold">Sign in to view bookings</h1>
          <Link href="/login"><Button>Sign in</Button></Link>
        </div>
      </SiteShell>
    );
  }

  const statusVariant = (s: string) => {
    switch (s) {
      case "confirmed":
        return "default";
      case "completed":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <h1 className="text-2xl font-bold mb-4">Bookings</h1>
        <Tabs defaultValue="mine">
          <TabsList>
            <TabsTrigger value="mine">My bookings</TabsTrigger>
            <TabsTrigger value="lister">Bookings I&apos;ve received</TabsTrigger>
          </TabsList>
          <TabsContent value="mine" className="mt-4 space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)
            ) : mine.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                You don&apos;t have any bookings yet.
              </div>
            ) : (
              mine.map((b) => (
                <Card key={b.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {format(new Date(b.check_in), "PP")} →{" "}
                      {format(new Date(b.check_out), "PP")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatPrice(convert(Number(b.total_price), b.currency), display)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(b.status)} className="capitalize">
                      {b.status}
                    </Badge>
                    <Link href={`/property/${b.property_id}`}>
                      <Button size="sm" variant="outline">View</Button>
                    </Link>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
          <TabsContent value="lister" className="mt-4">
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Lister booking view coming soon — manage incoming requests from{" "}
              <Link href="/admin-properties" className="text-primary underline">
                /admin-properties
              </Link>
              .
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SiteShell>
  );
}
