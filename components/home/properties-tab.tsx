"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Property } from "@/lib/types/database";
import { PropertyCard } from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Filters } from "@/components/filter-sheet";

const PAGE = 10;

interface Props {
  search: string;
  filters: Filters;
}

export function PropertiesTab({ search, filters }: Props) {
  const supabase = getSupabaseBrowserClient();
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (from: number, reset = false) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      let q = supabase
        .from("properties")
        .select("*", { count: "exact" })
        .eq("is_available", true)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);

      if (filters.minPrice) q = q.gte("price", Number(filters.minPrice));
      if (filters.maxPrice) q = q.lte("price", Number(filters.maxPrice));
      if (filters.minBedrooms) q = q.gte("bedrooms", Number(filters.minBedrooms));
      if (filters.country !== "all") q = q.eq("location_country", filters.country);
      if (filters.currency !== "all") q = q.eq("currency", filters.currency);

      const { data, count } = await q;
      const next = (data ?? []) as Property[];
      if (reset) setItems(next);
      else setItems((prev) => [...prev, ...next]);
      const newTotal = (reset ? next.length : items.length + next.length);
      setMore(count != null ? newTotal < count : next.length === PAGE);
      setLoading(false);
      setLoadingMore(false);
    },
    [supabase, filters, items.length]
  );

  useEffect(() => {
    load(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.minPrice, filters.maxPrice, filters.minBedrooms, filters.country, filters.currency]);

  const filtered = search
    ? items.filter((p) => {
        const s = search.toLowerCase();
        return (
          p.title.toLowerCase().includes(s) ||
          p.location_city.toLowerCase().includes(s) ||
          (p.location_state ?? "").toLowerCase().includes(s) ||
          p.location_country.toLowerCase().includes(s)
        );
      })
    : items;

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No properties match your search.
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <PropertyCard key={p.id} property={p} />
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
