"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Friendship, Profile } from "@/lib/types/database";
import { avatarFallback } from "@/lib/fallback-image";

export default function FindFriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [existing, setExisting] = useState<Map<string, Friendship>>(new Map());

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("friendships")
        .select("*")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
      const map = new Map<string, Friendship>();
      ((data ?? []) as Friendship[]).forEach((f) => {
        const other = f.user_id === user.id ? f.friend_id : f.user_id;
        map.set(other, f);
      });
      setExisting(map);
    })();
  }, [user, supabase]);

  useEffect(() => {
    if (!term.trim()) {
      setResults([]);
      return;
    }
    const id = setTimeout(async () => {
      let q = supabase
        .from("profiles")
        .select("*")
        .ilike("name", `%${term}%`)
        .limit(30);
      if (user) q = q.neq("id", user.id);
      const { data } = await q;
      setResults((data ?? []) as Profile[]);
    }, 250);
    return () => clearTimeout(id);
  }, [term, supabase, user]);

  async function sendRequest(targetId: string) {
    if (!user) return;
    const { error, data } = await supabase
      .from("friendships")
      .insert({ user_id: user.id, friend_id: targetId, status: "pending" })
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setExisting((m) => new Map(m).set(targetId, data as Friendship));
    toast.success("Request sent");
  }

  if (!user && !authLoading) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center space-y-3">
          <h1 className="text-2xl font-semibold">Sign in to find friends</h1>
          <Link href="/login"><Button>Sign in</Button></Link>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Find friends</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search by name"
            className="pl-9"
          />
        </div>
        {results.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 text-sm">
            {term ? "No matches." : "Start typing to search."}
          </div>
        ) : (
          <ul className="space-y-2">
            {results.map((p) => {
              const f = existing.get(p.id);
              return (
                <li key={p.id}>
                  <Card className="p-3 flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={p.avatar_url ?? undefined} />
                      <AvatarFallback>
                        <img src={avatarFallback(p.name)} alt="" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <Link href={`/u/${p.id}`} className="font-medium hover:underline line-clamp-1">
                        {p.name ?? "User"}
                      </Link>
                      {p.bio && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{p.bio}</div>
                      )}
                    </div>
                    {f?.status === "accepted" ? (
                      <Button variant="ghost" size="sm" disabled className="gap-1">
                        <Check className="size-4" /> Friends
                      </Button>
                    ) : f?.status === "pending" ? (
                      <Button variant="outline" size="sm" disabled>Pending</Button>
                    ) : (
                      <Button size="sm" className="gap-1" onClick={() => sendRequest(p.id)}>
                        <UserPlus className="size-4" /> Add
                      </Button>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SiteShell>
  );
}
