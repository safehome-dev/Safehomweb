"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile, ServiceProvider } from "@/lib/types/database";
import { ServiceCard } from "@/components/service-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Filters } from "@/components/filter-sheet";

const PAGE = 10;

type ProviderWithProfile = ServiceProvider & { profile: Pick<Profile, "name" | "avatar_url"> | null };

interface Props {
  search: string;
  filters: Filters;
}

export function ServicesTab({ search, filters }: Props) {
  const supabase = getSupabaseBrowserClient();
  const [items, setItems] = useState<ProviderWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (from: number, reset = false) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      let q = supabase
        .from("service_providers")
        .select("*", { count: "exact" })
        .eq("is_active", true)
        .order("average_rating", { ascending: false, nullsFirst: false })
        .range(from, from + PAGE - 1);

      if (filters.minPrice) q = q.gte("hourly_rate", Number(filters.minPrice));
      if (filters.maxPrice) q = q.lte("hourly_rate", Number(filters.maxPrice));
      if (filters.country !== "all") q = q.eq("country", filters.country);
      if (filters.currency !== "all") q = q.eq("currency", filters.currency);

      const { data, count } = await q;
      const rows = (data ?? []) as ServiceProvider[];
      const userIds = rows.map((r) => r.user_id);
      const profilesById = new Map<string, Pick<Profile, "name" | "avatar_url"> | null>();
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", userIds);
        ((profiles ?? []) as Profile[]).forEach((p) =>
          profilesById.set(p.id, { name: p.name, avatar_url: p.avatar_url })
        );
      }
      const enriched = rows.map((r) => ({
        ...r,
        profile: profilesById.get(r.user_id) ?? null,
      }));

      if (reset) setItems(enriched);
      else setItems((prev) => [...prev, ...enriched]);
      const newTotal = (reset ? enriched.length : items.length + enriched.length);
      setMore(count != null ? newTotal < count : enriched.length === PAGE);
      setLoading(false);
      setLoadingMore(false);
    },
    [supabase, filters, items.length]
  );

  useEffect(() => {
    load(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.minPrice, filters.maxPrice, filters.country, filters.currency]);

  const filtered = search
    ? items.filter((p) => {
        const s = search.toLowerCase();
        return (
          p.business_name.toLowerCase().includes(s) ||
          (p.profile?.name ?? "").toLowerCase().includes(s) ||
          p.city.toLowerCase().includes(s) ||
          (p.service_categories ?? []).some((c) => c.toLowerCase().includes(s))
        );
      })
    : items;

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[16/12] rounded-xl" />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No service providers found.
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <ServiceCard key={p.id} provider={p} />
        ))}
      </div>
      {more && (
        <div className="flex justify-center mt-8">
          <Button
            variant="outline"
            disabled={loadingMore}
            onClick={() => load(items.length)}
          >
            {loadingMore && <Loader2 className="size-4 mr-2 animate-spin" />}
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
