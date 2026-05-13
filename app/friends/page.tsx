"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  MessageCircle,
  Search,
  Users,
  UserPlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { avatarFallback } from "@/lib/fallback-image";
import type { Friendship, Profile } from "@/lib/types/database";

type FriendRow = {
  friendshipId: string;
  friend: Pick<Profile, "id" | "name" | "avatar_url" | "city" | "bio">;
};

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmRemove, setConfirmRemove] = useState<FriendRow | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function refresh() {
    if (!user) return;
    setLoading(true);

    const [friendshipsRes, pendingRes] = await Promise.all([
      supabase
        .from("friendships")
        .select("*")
        .eq("status", "accepted")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .order("created_at", { ascending: false }),
      supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .eq("friend_id", user.id)
        .eq("status", "pending"),
    ]);

    const rows = (friendshipsRes.data ?? []) as Friendship[];
    const otherIds = rows.map((r) =>
      r.user_id === user.id ? r.friend_id : r.user_id
    );

    const profileMap = new Map<
      string,
      Pick<Profile, "id" | "name" | "avatar_url" | "city" | "bio">
    >();
    if (otherIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, city, bio")
        .in("id", otherIds);
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

    setFriends(
      rows
        .map((r) => {
          const otherId = r.user_id === user.id ? r.friend_id : r.user_id;
          const friend = profileMap.get(otherId);
          return friend ? { friendshipId: r.id, friend } : null;
        })
        .filter((x): x is FriendRow => !!x)
    );
    setPendingCount(pendingRes.count ?? 0);
    setLoading(false);
  }

  async function removeFriend() {
    if (!confirmRemove) return;
    setRemoving(true);
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", confirmRemove.friendshipId);
    setRemoving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setFriends((prev) =>
      prev.filter((f) => f.friendshipId !== confirmRemove.friendshipId)
    );
    toast.success("Friend removed");
    setConfirmRemove(null);
  }

  if (!user && !authLoading) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center space-y-3">
          <h1 className="text-2xl font-semibold">Sign in to see your friends</h1>
          <Link href="/login">
            <Button>Sign in</Button>
          </Link>
        </div>
      </SiteShell>
    );
  }

  const filtered = search
    ? friends.filter((f) =>
        (f.friend.name ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : friends;

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Friends</h1>
          <Link href="/find-friends">
            <Button size="sm" className="gap-2">
              <UserPlus className="size-4" /> Find friends
            </Button>
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search friends…"
            className="pl-9"
          />
        </div>

        {pendingCount > 0 && (
          <Link href="/friend-requests">
            <Card className="p-4 flex items-center gap-3 hover:bg-accent transition">
              <div className="size-10 rounded-lg bg-primary text-primary-foreground grid place-items-center">
                <Users className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">Friend requests</div>
                <div className="text-sm text-muted-foreground">
                  {pendingCount} pending
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Card>
          </Link>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center space-y-4">
            <Users className="size-12 mx-auto text-muted-foreground" />
            <div>
              <div className="font-medium">
                {search ? "No friends match your search." : "No friends yet"}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {search
                  ? "Try a different name."
                  : "Start adding people to build your network."}
              </p>
            </div>
            {!search && (
              <Link href="/find-friends">
                <Button className="gap-2">
                  <UserPlus className="size-4" /> Find friends
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((f) => (
              <li key={f.friendshipId}>
                <Card className="p-3 flex items-center gap-3">
                  <Link
                    href={`/u/${f.friend.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <Avatar className="size-12">
                      <AvatarImage src={f.friend.avatar_url ?? undefined} />
                      <AvatarFallback>
                        <img src={avatarFallback(f.friend.name)} alt="" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium line-clamp-1">
                        {f.friend.name ?? "Unknown"}
                      </div>
                      {f.friend.city && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          📍 {f.friend.city}
                        </div>
                      )}
                    </div>
                  </Link>
                  <Link href={`/messages/${f.friend.id}`}>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Message"
                      className="text-primary"
                    >
                      <MessageCircle className="size-5" />
                    </Button>
                  </Link>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Remove friend"
                    onClick={() => setConfirmRemove(f)}
                  >
                    <Trash2 className="size-5 text-destructive" />
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={!!confirmRemove}
        onOpenChange={(open) => {
          if (!open) setConfirmRemove(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove friend?</DialogTitle>
            <DialogDescription>
              {confirmRemove?.friend.name
                ? `${confirmRemove.friend.name} will be removed from your friends. You can add them back later.`
                : "This person will be removed from your friends."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removing}
              onClick={removeFriend}
            >
              {removing ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SiteShell>
  );
}
