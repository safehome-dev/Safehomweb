"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile, RoommateProfile } from "@/lib/types/database";
import { useAuth } from "@/lib/providers/auth-provider";
import { RoommateCard } from "@/components/roommate-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Filters } from "@/components/filter-sheet";
import { cached } from "@/lib/cache";

const PAGE = 10;

type RoommateWithProfile = RoommateProfile & {
  profile: Pick<Profile, "name" | "avatar_url" | "phone"> | null;
};

interface Props {
  search: string;
  filters: Filters;
}

function filtersKey(f: Filters) {
  return [f.minPrice || "", f.maxPrice || "", f.country, f.currency].join("|");
}

export function RoommatesTab({ search, filters }: Props) {
  const supabase = getSupabaseBrowserClient();
  const { user } = useAuth();
  const [items, setItems] = useState<RoommateWithProfile[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const fetchPage = useCallback(
    async (from: number) => {
      let q = supabase
        .from("roommate_profiles")
        .select("*", { count: "exact" })
        .eq("is_active", true)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);

      if (user) q = q.neq("user_id", user.id);
      if (filters.country !== "all") q = q.eq("country", filters.country);
      if (filters.currency !== "all") q = q.eq("currency", filters.currency);
      if (filters.minPrice) q = q.gte("budget_min", Number(filters.minPrice));
      if (filters.maxPrice) q = q.lte("budget_max", Number(filters.maxPrice));

      const blocksKey = user ? `roommates:blocks:${user.id}` : "roommates:blocks:anon";
      const blocksPromise = user
        ? cached(
            blocksKey,
            async () => {
              const { data } = await supabase
                .from("user_blocks")
                .select("blocked_user_id")
                .eq("blocker_id", user.id);
              return ((data ?? []) as Array<{ blocked_user_id: string }>).map(
                (b) => b.blocked_user_id
              );
            },
            60_000
          )
        : Promise.resolve([] as string[]);

      const [rowsRes, blockedIds] = await Promise.all([q, blocksPromise]);
      const rows = (rowsRes.data ?? []) as RoommateProfile[];
      const count = rowsRes.count ?? null;
      const blocked = new Set(blockedIds);
      const filteredRows = rows.filter((r) => !blocked.has(r.user_id));

      const userIds = filteredRows.map((r) => r.user_id);
      const profilesById = new Map<string, Pick<Profile, "name" | "avatar_url" | "phone"> | null>();
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, avatar_url, phone")
          .in("id", userIds);
        ((profiles ?? []) as Profile[]).forEach((p) =>
          profilesById.set(p.id, { name: p.name, avatar_url: p.avatar_url, phone: p.phone })
        );
      }
      const enriched: RoommateWithProfile[] = filteredRows.map((r) => ({
        ...r,
        profile: profilesById.get(r.user_id) ?? null,
      }));
      return { rows: enriched, count };
    },
    [supabase, user, filters]
  );

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    (async () => {
      const key = `roommates:p0:${user?.id ?? "anon"}:${filtersKey(filters)}`;
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
  }, [fetchPage, filters, user?.id]);

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

  const filtered = items.filter((p) => !dismissed.has(p.id));
  const searched = search
    ? filtered.filter((p) => {
        const s = search.toLowerCase();
        return (
          p.title.toLowerCase().includes(s) ||
          (p.profile?.name ?? "").toLowerCase().includes(s) ||
          p.city.toLowerCase().includes(s) ||
          p.country.toLowerCase().includes(s)
        );
      })
    : filtered;

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
        ))}
      </div>
    );
  }

  if (searched.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No roommate profiles match.
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {searched.map((p) => (
          <RoommateCard
            key={p.id}
            profile={p}
            onSkip={() => setDismissed((s) => new Set(s).add(p.id))}
            onBlocked={() =>
              setItems((prev) => prev.filter((r) => r.user_id !== p.user_id))
            }
          />
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
