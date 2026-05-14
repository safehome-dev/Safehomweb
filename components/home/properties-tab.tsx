"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Property } from "@/lib/types/database";
import { PropertyCard } from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Filters } from "@/components/filter-sheet";
import { cached } from "@/lib/cache";

const PAGE = 10;

interface Props {
  search: string;
  filters: Filters;
}

function filtersKey(f: Filters) {
  return [
    f.minPrice || "",
    f.maxPrice || "",
    f.minBedrooms || "",
    f.country,
    f.currency,
  ].join("|");
}

export function PropertiesTab({ search, filters }: Props) {
  const supabase = getSupabaseBrowserClient();
  const [items, setItems] = useState<Property[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(
    async (from: number) => {
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
      return { rows: (data ?? []) as Property[], count: count ?? null };
    },
    [supabase, filters]
  );

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    (async () => {
      const key = `properties:p0:${filtersKey(filters)}`;
      const { rows, count } = await cached(key, () => fetchPage(0), 60_000);
      if (ignore) return;
      setItems(rows);
      setTotal(count);
      setMore(count != null ? rows.length < count : rows.length === PAGE);
      setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, [fetchPage, filters]);

  async function loadMore() {
    setLoadingMore(true);
    const { rows, count } = await fetchPage(items.length);
    setItems((prev) => {
      const next = [...prev, ...rows];
      setMore(count != null ? next.length < count : rows.length === PAGE);
      return next;
    });
    if (count != null) setTotal(count);
    setLoadingMore(false);
  }

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
      {more && total != null && items.length < total && (
        <div className="flex justify-center mt-8">
          <Button variant="outline" disabled={loadingMore} onClick={loadMore}>
            {loadingMore && <Loader2 className="size-4 mr-2 animate-spin" />}
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
