"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PropertyCard } from "@/components/property-card";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/providers/auth-provider";
import type { Property, Wishlist } from "@/lib/types/database";

type Item = Wishlist & { properties: Property | null };

export default function WishlistPage() {
  const supabase = getSupabaseBrowserClient();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("wishlists")
        .select("id, property_id, user_id, created_at, properties(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setItems((data ?? []) as unknown as Item[]);
      setLoading(false);
    })();
  }, [user, authLoading, supabase]);

  async function remove(itemId: string) {
    await supabase.from("wishlists").delete().eq("id", itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    toast.success("Removed from wishlist");
  }

  if (!user && !authLoading) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center space-y-4">
          <h1 className="text-2xl font-semibold">Login Required</h1>
          <p className="text-muted-foreground">Sign in to view your saved properties.</p>
          <Link href="/login"><Button>Sign in</Button></Link>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">My Wishlist</h1>
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-muted-foreground">Nothing saved yet.</p>
            <Link href="/"><Button>Explore Properties</Button></Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((i) =>
              i.properties ? (
                <PropertyCard
                  key={i.id}
                  property={i.properties}
                  removable
                  onRemove={() => remove(i.id)}
                />
              ) : null
            )}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
