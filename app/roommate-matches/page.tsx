"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, HeartHandshake, Loader2, MessageCircle } from "lucide-react";

import { SiteShell } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCurrency } from "@/lib/providers/currency-provider";
import { formatPrice } from "@/lib/currency";
import { avatarFallback } from "@/lib/fallback-image";
import type { Profile, RoommateProfile } from "@/lib/types/database";

interface MatchRow {
  id: string;
  matched_at: string | null;
  other: RoommateProfile & {
    profile?: Pick<Profile, "id" | "name" | "avatar_url"> | null;
  };
}

export default function RoommateMatchesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const { convert, display } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<RoommateProfile | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/roommate-matches")}`);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function load() {
    if (!user) return;
    setLoading(true);

    const { data: mine } = await supabase
      .from("roommate_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    const me = mine as RoommateProfile | null;
    setMyProfile(me);

    if (!me) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const myField = me.profile_type === "seeking" ? "seeker_profile_id" : "provider_profile_id";
    const otherField = me.profile_type === "seeking" ? "provider_profile_id" : "seeker_profile_id";

    const { data: rows } = await supabase
      .from("roommate_matches")
      .select("*")
      .eq(myField, me.id)
      .eq("is_match", true)
      .order("matched_at", { ascending: false });

    const matchList = (rows ?? []) as Array<{
      id: string;
      matched_at: string | null;
      seeker_profile_id: string;
      provider_profile_id: string;
    }>;
    const otherIds = matchList.map((m) =>
      m[otherField as "seeker_profile_id" | "provider_profile_id"]
    );

    if (!otherIds.length) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const { data: otherProfiles } = await supabase
      .from("roommate_profiles")
      .select("*")
      .in("id", otherIds);
    const profileMap = new Map<string, RoommateProfile>(
      ((otherProfiles ?? []) as RoommateProfile[]).map((p) => [p.id, p])
    );

    const userIds = ((otherProfiles ?? []) as RoommateProfile[]).map((p) => p.user_id);
    let userMap = new Map<string, Pick<Profile, "id" | "name" | "avatar_url">>();
    if (userIds.length) {
      const { data: users } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);
      userMap = new Map(
        ((users ?? []) as Profile[]).map((u) => [
          u.id,
          { id: u.id, name: u.name, avatar_url: u.avatar_url },
        ])
      );
    }

    const enriched: MatchRow[] = matchList
      .map((m) => {
        const otherId =
          m[otherField as "seeker_profile_id" | "provider_profile_id"];
        const other = profileMap.get(otherId);
        if (!other) return null;
        return {
          id: m.id,
          matched_at: m.matched_at,
          other: { ...other, profile: userMap.get(other.user_id) ?? null },
        } as MatchRow;
      })
      .filter((x): x is MatchRow => x !== null);

    setMatches(enriched);
    setLoading(false);
  }

  if (authLoading || loading) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin mx-auto mb-2" /> Loading matches…
        </div>
      </SiteShell>
    );
  }

  if (!myProfile) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-10 max-w-md">
          <Card className="p-6 text-center space-y-3">
            <HeartHandshake className="size-12 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-bold">No roommate profile yet</h1>
            <p className="text-sm text-muted-foreground">
              Create your roommate profile to start matching.
            </p>
            <Link href="/create-roommate-profile">
              <Button>Create roommate profile</Button>
            </Link>
          </Card>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-2xl font-bold">Roommate matches</h1>
        </div>

        {matches.length === 0 ? (
          <Card className="p-10 text-center space-y-3">
            <HeartHandshake className="size-12 mx-auto text-muted-foreground" />
            <div className="font-medium">No matches yet</div>
            <p className="text-sm text-muted-foreground">
              Like profiles in the Roommates tab to start matching.
            </p>
            <Link href="/">
              <Button variant="outline">Browse roommates</Button>
            </Link>
          </Card>
        ) : (
          <ul className="space-y-3">
            {matches.map((m) => {
              const otherName = m.other.profile?.name ?? "Unknown";
              const price =
                m.other.profile_type === "seeking"
                  ? `${formatPrice(convert(Number(m.other.budget_min ?? 0), m.other.currency), display)}–${formatPrice(convert(Number(m.other.budget_max ?? 0), m.other.currency), display)}`
                  : m.other.rent_amount
                    ? formatPrice(convert(Number(m.other.rent_amount), m.other.currency), display)
                    : null;
              return (
                <li key={m.id}>
                  <Card className="p-4 flex items-start gap-3">
                    <Avatar className="size-14">
                      <AvatarImage src={m.other.profile?.avatar_url ?? undefined} />
                      <AvatarFallback>
                        <img src={avatarFallback(otherName)} alt="" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold line-clamp-1">{otherName}</span>
                        <Badge variant="secondary" className="capitalize">
                          {m.other.profile_type}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        📍 {m.other.city}, {m.other.country}
                      </div>
                      {m.other.title && (
                        <div className="text-sm line-clamp-1">{m.other.title}</div>
                      )}
                      {price && (
                        <div className="text-sm font-semibold text-primary">{price}</div>
                      )}
                      {m.matched_at && (
                        <div className="text-xs text-muted-foreground">
                          Matched {format(new Date(m.matched_at), "PP")}
                        </div>
                      )}
                    </div>
                    <Link href={`/messages/${m.other.user_id}`}>
                      <Button size="icon" variant="ghost" className="text-primary">
                        <MessageCircle className="size-5" />
                      </Button>
                    </Link>
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
