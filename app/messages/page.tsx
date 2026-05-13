"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

import { SiteShell } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { avatarFallback } from "@/lib/fallback-image";
import type { Message, Profile } from "@/lib/types/database";

interface Thread {
  otherId: string;
  other: Pick<Profile, "id" | "name" | "avatar_url"> | null;
  last: Message;
  unread: number;
}

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    const refresh = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(500);
      const rows = (data ?? []) as Message[];
      const byOther = new Map<string, { last: Message; unread: number }>();
      for (const m of rows) {
        const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        const entry = byOther.get(other);
        if (!entry) {
          byOther.set(other, {
            last: m,
            unread: !m.is_read && m.recipient_id === user.id ? 1 : 0,
          });
        } else {
          if (!m.is_read && m.recipient_id === user.id) entry.unread += 1;
        }
      }
      const ids = [...byOther.keys()];
      let profileMap = new Map<string, Pick<Profile, "id" | "name" | "avatar_url">>();
      if (ids.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", ids);
        profileMap = new Map(
          ((profiles ?? []) as Profile[]).map((p) => [
            p.id,
            { id: p.id, name: p.name, avatar_url: p.avatar_url },
          ])
        );
      }
      const list: Thread[] = [...byOther.entries()].map(([otherId, v]) => ({
        otherId,
        other: profileMap.get(otherId) ?? null,
        last: v.last,
        unread: v.unread,
      }));
      list.sort(
        (a, b) =>
          new Date(b.last.created_at ?? 0).getTime() -
          new Date(a.last.created_at ?? 0).getTime()
      );
      setThreads(list);
      setLoading(false);
    };
    refresh();
    const channel = supabase
      .channel("messages-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` },
        refresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `sender_id=eq.${user.id}` },
        refresh
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, authLoading, supabase]);

  if (!user && !authLoading) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center space-y-3">
          <h1 className="text-2xl font-semibold">Sign in to see messages</h1>
          <Link href="/login"><Button>Sign in</Button></Link>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Messages</h1>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No conversations yet.</div>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {threads.map((t) => (
              <li key={t.otherId}>
                <Link
                  href={`/messages/${t.otherId}`}
                  className="flex items-center gap-3 p-4 hover:bg-accent transition"
                >
                  <Avatar className="size-12 shrink-0">
                    <AvatarImage src={t.other?.avatar_url ?? undefined} />
                    <AvatarFallback>
                      <img src={avatarFallback(t.other?.name ?? "user")} alt="" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium line-clamp-1">
                        {t.other?.name ?? "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {t.last.created_at
                          ? formatDistanceToNow(new Date(t.last.created_at), { addSuffix: true })
                          : ""}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {t.last.message}
                    </div>
                  </div>
                  {t.unread > 0 && (
                    <Badge className="bg-primary text-primary-foreground">{t.unread}</Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SiteShell>
  );
}
