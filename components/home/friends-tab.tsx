"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/providers/auth-provider";
import type { Friendship, Profile } from "@/lib/types/database";
import { FriendCard } from "@/components/friend-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cached } from "@/lib/cache";

interface Props {
  search: string;
}

export function FriendsTab({ search }: Props) {
  const supabase = getSupabaseBrowserClient();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<
    Array<{ since: string; friend: Pick<Profile, "id" | "name" | "avatar_url" | "bio"> }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let ignore = false;
    (async () => {
      const list = await cached(
        `friends:${user.id}`,
        async () => {
          const { data } = await supabase
            .from("friendships")
            .select("*")
            .eq("status", "accepted")
            .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
            .order("created_at", { ascending: false });
          const rows = (data ?? []) as Friendship[];
          const friendIds = rows.map((r) =>
            r.user_id === user.id ? r.friend_id : r.user_id
          );
          const profileMap = new Map<string, Pick<Profile, "id" | "name" | "avatar_url" | "bio">>();
          if (friendIds.length) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, name, avatar_url, bio")
              .in("id", friendIds);
            ((profiles ?? []) as Profile[]).forEach((p) =>
              profileMap.set(p.id, { id: p.id, name: p.name, avatar_url: p.avatar_url, bio: p.bio })
            );
          }
          return rows
            .map((r) => {
              const fid = r.user_id === user.id ? r.friend_id : r.user_id;
              const friend = profileMap.get(fid);
              return friend ? { since: r.created_at, friend } : null;
            })
            .filter((x): x is { since: string; friend: Pick<Profile, "id" | "name" | "avatar_url" | "bio"> } => !!x);
        },
        60_000
      );
      if (ignore) return;
      setItems(list);
      setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, [user, authLoading, supabase]);

  if (!user) {
    return (
      <div className="text-center py-20 space-y-3">
        <div className="text-muted-foreground">Sign in to see your friends.</div>
        <Link href="/login">
          <Button>Sign in</Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  const filtered = search
    ? items.filter((i) => (i.friend.name ?? "").toLowerCase().includes(search.toLowerCase()))
    : items;

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="text-muted-foreground">You haven&apos;t added friends yet.</div>
        <Link href="/find-friends">
          <Button className="gap-2"><UserPlus className="size-4" /> Find friends</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((i) => (
        <FriendCard key={i.friend.id} friend={i.friend} since={i.since} />
      ))}
    </div>
  );
}
