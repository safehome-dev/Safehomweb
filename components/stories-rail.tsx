"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { avatarFallback } from "@/lib/fallback-image";
import { appLink, storeUrlFor, openAppOrStore } from "@/lib/app-links";
import { usePlatform } from "@/lib/use-platform";
import type { Profile } from "@/lib/types/database";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type Author = {
  userId: string;
  name: string;
  avatar: string | null;
};

/**
 * Who has a live story, shown on the web but only playable in the app.
 *
 * Showing the ring of faces rather than a bare "get the app" banner is the
 * whole point: the invitation is specific — these people posted something in
 * the last day — so tapping one is a real thing someone wants, and the app is
 * the only way to finish it. A banner nobody is curious about gets ignored.
 *
 * Nothing here plays media. Stories expire after 24 hours and are read by the
 * same query the app uses, so the rail empties on its own when nobody has
 * posted and the whole section disappears rather than sitting there empty.
 */
export function StoriesRail() {
  const supabase = getSupabaseBrowserClient();
  const [authors, setAuthors] = useState<Author[] | null>(null);
  const [selected, setSelected] = useState<Author | null>(null);
  const platform = usePlatform();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: stories } = await supabase
        .from("stories")
        .select("user_id, created_at")
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(100);

      const rows = (stories ?? []) as Array<{ user_id: string }>;
      // One entry per person, newest first — the order the query already
      // returns, so a Set preserves it.
      const userIds = Array.from(new Set(rows.map((r) => r.user_id))).slice(0, 20);

      if (userIds.length === 0) {
        if (!cancelled) setAuthors([]);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);

      const byId = new Map(
        ((profiles ?? []) as Profile[]).map((p) => [p.id, p])
      );

      const list: Author[] = userIds.map((id) => ({
        userId: id,
        name: byId.get(id)?.name ?? "SafeHome member",
        avatar: byId.get(id)?.avatar_url ?? null,
      }));

      if (!cancelled) setAuthors(list);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (authors === null) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
            <Skeleton className="size-16 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    );
  }

  // Signed-out visitors read no stories at all: the table's select policy is
  // limited to authenticated users, so the query comes back empty for exactly
  // the people most worth converting. A quiet day looks the same from here.
  // Either way the invitation still stands, it just cannot name anyone.
  if (authors.length === 0) {
    return (
      <section
        aria-label="Stories"
        className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-primary">
          <Play className="size-4 fill-white text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Stories are in the app</p>
          <p className="text-sm text-muted-foreground">
            Listers post walkthroughs and room tours that disappear after 24 hours.
          </p>
        </div>
        <Button size="sm" asChild>
          <a href={storeUrlFor(platform === "ios" ? "ios" : "android")}>Get the app</a>
        </Button>
      </section>
    );
  }

  return (
    <>
      <section aria-label="Stories">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Stories</h2>
          <span className="text-xs text-muted-foreground">Watch in the app</span>
        </div>

        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
          {authors.map((author) => (
            <button
              key={author.userId}
              onClick={() => setSelected(author)}
              className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center"
            >
              <span className="rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-primary p-[2.5px]">
                <span className="block rounded-full bg-background p-[2px]">
                  <Avatar className="size-14">
                    <AvatarImage src={author.avatar ?? undefined} />
                    <AvatarFallback>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={avatarFallback(author.name)} alt="" />
                    </AvatarFallback>
                  </Avatar>
                </span>
              </span>
              <span className="w-full truncate text-xs text-muted-foreground">
                {author.name.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
      </section>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="items-center text-center">
            <span className="mb-2 grid size-14 place-items-center rounded-2xl bg-primary/10">
              <Play className="size-6 fill-primary text-primary" />
            </span>
            <DialogTitle>Stories play in the app</DialogTitle>
            <DialogDescription>
              {selected?.name.split(" ")[0]} posted a story. Stories are video
              and photo, so they live in the SafeHome app — get it free and pick
              up right here.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            {platform !== "desktop" && selected && (
              <Button
                onClick={() =>
                  openAppOrStore(appLink.stories(selected.userId), platform)
                }
              >
                Open in app
              </Button>
            )}
            <Button
              variant={platform === "desktop" ? "default" : "outline"}
              asChild
            >
              <a href={storeUrlFor(platform === "ios" ? "ios" : "android")}>
                {platform === "ios" ? "Get it on the App Store" : "Get it on Google Play"}
              </a>
            </Button>
            {platform === "desktop" && (
              <Button variant="ghost" asChild>
                <a href={storeUrlFor("ios")}>Get it on the App Store</a>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
