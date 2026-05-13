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

const PAGE = 10;

type RoommateWithProfile = RoommateProfile & {
  profile: Pick<Profile, "name" | "avatar_url" | "phone"> | null;
};

interface Props {
  search: string;
  filters: Filters;
}

export function RoommatesTab({ search, filters }: Props) {
  const supabase = getSupabaseBrowserClient();
  const { user } = useAuth();
  const [items, setItems] = useState<RoommateWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const load = useCallback(
    async (from: number, reset = false) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);

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

      const { data, count } = await q;
      const rows = (data ?? []) as RoommateProfile[];

      let blocked = new Set<string>();
      if (user) {
        const { data: blocks } = await supabase
          .from("user_blocks")
          .select("blocked_user_id")
          .eq("blocker_id", user.id);
        blocked = new Set(
          ((blocks ?? []) as Array<{ blocked_user_id: string }>).map((b) => b.blocked_user_id)
        );
      }
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
      const enriched = filteredRows.map((r) => ({
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
    [supabase, user, filters, items.length]
  );

  useEffect(() => {
    load(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.minPrice, filters.maxPrice, filters.country, filters.currency, user?.id]);

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
          />
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
