"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, Inbox, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { avatarFallback } from "@/lib/fallback-image";
import type { Friendship, Profile } from "@/lib/types/database";
import { invalidate } from "@/lib/cache";

type RequestRow = {
  id: string;
  requesterId: string;
  createdAt: string;
  requester: Pick<Profile, "id" | "name" | "avatar_url" | "city" | "bio">;
};

export default function FriendRequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .eq("friend_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const rows = (data ?? []) as Friendship[];
    const requesterIds = rows.map((r) => r.user_id);

    const profileMap = new Map<
      string,
      Pick<Profile, "id" | "name" | "avatar_url" | "city" | "bio">
    >();
    if (requesterIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, city, bio")
        .in("id", requesterIds);
      ((profiles ?? []) as Profile[]).forEach((p) =>
        profileMap.set(p.id, {
          id: p.id,
          name: p.name,
          avatar_url: p.avatar_url,
          city: p.city,
          bio: p.bio,
        })
      );
    }

    setRequests(
      rows
        .map((r) => {
          const requester = profileMap.get(r.user_id);
          if (!requester) return null;
          return {
            id: r.id,
            requesterId: r.user_id,
            createdAt: r.created_at,
            requester,
          } satisfies RequestRow;
        })
        .filter((x): x is RequestRow => !!x)
    );
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

  async function accept(row: RequestRow) {
    if (!user) return;
    setBusyId(row.id);
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) {
      setBusyId(null);
      toast.error(error.message || "Could not accept");
      return;
    }
    await supabase.from("notifications").insert({
      user_id: row.requesterId,
      title: "Friend Request Accepted",
      message: `${user.user_metadata?.name ?? user.email ?? "Someone"} accepted your friend request`,
      type: "connection",
      action_url: "/friends",
    });
    if (user) invalidate(`friends:${user.id}`);
    invalidate(`friends:${row.requesterId}`);
    setRequests((prev) => prev.filter((r) => r.id !== row.id));
    setBusyId(null);
    toast.success("Friend request accepted");
  }

  async function reject(row: RequestRow) {
    setBusyId(row.id);
    const { error } = await supabase
      .from("friendships")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    setBusyId(null);
    if (error) {
      toast.error(error.message || "Could not decline");
      return;
    }
    setRequests((prev) => prev.filter((r) => r.id !== row.id));
    toast.success("Request declined");
  }

  if (!user && !authLoading) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center space-y-3">
          <h1 className="text-2xl font-semibold">Sign in to see requests</h1>
          <Link href="/login">
            <Button>Sign in</Button>
          </Link>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Friend requests</h1>
          <Link href="/friends">
            <Button variant="outline" size="sm">
              My friends
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <Card className="p-10 text-center space-y-3">
            <Inbox className="size-12 mx-auto text-muted-foreground" />
            <div>
              <div className="font-medium">No pending requests</div>
              <p className="text-sm text-muted-foreground mt-1">
                You&apos;re all caught up.
              </p>
            </div>
            <Link href="/find-friends">
              <Button variant="outline">Find friends</Button>
            </Link>
          </Card>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              {requests.length} pending request{requests.length === 1 ? "" : "s"}
            </div>
            <ul className="space-y-2">
              {requests.map((r) => {
                const busy = busyId === r.id;
                return (
                  <li key={r.id}>
                    <Card className="p-4 space-y-4">
                      <Link
                        href={`/u/${r.requester.id}`}
                        className="flex items-start gap-3"
                      >
                        <Avatar className="size-14">
                          <AvatarImage src={r.requester.avatar_url ?? undefined} />
                          <AvatarFallback>
                            <img src={avatarFallback(r.requester.name)} alt="" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold line-clamp-1">
                            {r.requester.name ?? "Unknown user"}
                          </div>
                          {r.requester.city && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              📍 {r.requester.city}
                            </div>
                          )}
                          {r.requester.bio && (
                            <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {r.requester.bio}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(r.createdAt), {
                              addSuffix: true,
                            })}
                          </div>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        <Button
                          className="flex-1 gap-2"
                          disabled={busy}
                          onClick={() => accept(r)}
                        >
                          {busy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Check className="size-4" />
                          )}
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 gap-2"
                          disabled={busy}
                          onClick={() => reject(r)}
                        >
                          <X className="size-4" />
                          Decline
                        </Button>
                      </div>
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
