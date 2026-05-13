"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Search, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { avatarFallback } from "@/lib/fallback-image";
import type { Friendship, Profile } from "@/lib/types/database";

type Suggestion = Pick<
  Profile,
  "id" | "name" | "avatar_url" | "city" | "bio" | "user_type"
>;

type FriendshipState = {
  id: string;
  status: Friendship["status"];
};

const PAGE_SIZE = 100;

export default function FindFriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const [people, setPeople] = useState<Suggestion[]>([]);
  const [friendships, setFriendships] = useState<Map<string, FriendshipState>>(
    new Map()
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [profilesRes, friendshipRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, avatar_url, city, bio, user_type")
        .neq("id", user.id)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE),
      supabase
        .from("friendships")
        .select("*")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`),
    ]);

    setPeople((profilesRes.data ?? []) as Suggestion[]);

    const map = new Map<string, FriendshipState>();
    ((friendshipRes.data ?? []) as Friendship[]).forEach((f) => {
      const otherId = f.user_id === user.id ? f.friend_id : f.user_id;
      map.set(otherId, { id: f.id, status: f.status });
    });
    setFriendships(map);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void load();
  }, [user, authLoading, load]);

  async function sendRequest(target: Suggestion) {
    if (!user) return;
    setBusyId(target.id);
    const { data, error } = await supabase
      .from("friendships")
      .insert({ user_id: user.id, friend_id: target.id, status: "pending" })
      .select("id")
      .single();
    if (error) {
      setBusyId(null);
      toast.error(error.message || "Could not send friend request");
      return;
    }

    // Best-effort notification (matches mobile)
    await supabase.from("notifications").insert({
      user_id: target.id,
      title: "New Friend Request",
      message: `${user.user_metadata?.name ?? user.email ?? "Someone"} sent you a friend request`,
      type: "connection",
      action_url: "/friend-requests",
    });

    setFriendships((prev) => {
      const next = new Map(prev);
      next.set(target.id, {
        id: (data as { id: string } | null)?.id ?? target.id,
        status: "pending",
      });
      return next;
    });
    setBusyId(null);
    toast.success("Request sent");
  }

  async function cancelRequest(target: Suggestion) {
    if (!user) return;
    const f = friendships.get(target.id);
    if (!f) return;
    setBusyId(target.id);
    const { error } = await supabase.from("friendships").delete().eq("id", f.id);
    setBusyId(null);
    if (error) {
      toast.error(error.message || "Could not cancel");
      return;
    }
    setFriendships((prev) => {
      const next = new Map(prev);
      next.delete(target.id);
      return next;
    });
  }

  if (!user && !authLoading) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center space-y-3">
          <h1 className="text-2xl font-semibold">Sign in to find friends</h1>
          <Link href="/login">
            <Button>Sign in</Button>
          </Link>
        </div>
      </SiteShell>
    );
  }

  const term = search.toLowerCase().trim();
  const filtered = term
    ? people.filter(
        (p) =>
          (p.name ?? "").toLowerCase().includes(term) ||
          (p.city ?? "").toLowerCase().includes(term)
      )
    : people;

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Find friends</h1>
          <Link href="/friend-requests">
            <Button variant="outline" size="sm">
              Requests
            </Button>
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or location…"
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center space-y-2">
            <Search className="size-10 mx-auto text-muted-foreground" />
            <div className="font-medium">
              {term ? "No users found" : "Nobody to suggest yet"}
            </div>
            {term && (
              <p className="text-sm text-muted-foreground">
                Try a different search term.
              </p>
            )}
          </Card>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              Suggested friends ({filtered.length})
            </div>
            <ul className="space-y-2">
              {filtered.map((p) => {
                const f = friendships.get(p.id);
                const busy = busyId === p.id;
                return (
                  <li key={p.id}>
                    <Card className="p-3 flex items-center gap-3">
                      <Link
                        href={`/u/${p.id}`}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <Avatar className="size-12">
                          <AvatarImage src={p.avatar_url ?? undefined} />
                          <AvatarFallback>
                            <img src={avatarFallback(p.name)} alt="" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium line-clamp-1">
                            {p.name ?? "Unknown user"}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            📍 {p.city ?? "No location"}
                          </div>
                          {p.bio && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {p.bio}
                            </div>
                          )}
                          {p.user_type && (
                            <Badge
                              variant="secondary"
                              className="mt-1 capitalize text-[10px] px-1.5 py-0"
                            >
                              {p.user_type}
                            </Badge>
                          )}
                        </div>
                      </Link>

                      {busy ? (
                        <Button variant="outline" size="sm" disabled className="gap-2">
                          <Loader2 className="size-4 animate-spin" />
                        </Button>
                      ) : f?.status === "accepted" ? (
                        <Button variant="ghost" size="sm" disabled className="gap-1">
                          <Check className="size-4" /> Friends
                        </Button>
                      ) : f?.status === "pending" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelRequest(p)}
                          className="gap-1"
                        >
                          <X className="size-4" /> Pending
                        </Button>
                      ) : f?.status === "blocked" || f?.status === "rejected" ? null : (
                        <Button
                          size="sm"
                          onClick={() => sendRequest(p)}
                          className="gap-1"
                        >
                          <UserPlus className="size-4" /> Add
                        </Button>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </SiteShell>
  );
}
