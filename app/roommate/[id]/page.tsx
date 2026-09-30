"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bed,
  Briefcase,
  CalendarDays,
  MapPin,
  MessageCircle,
  User as UserIcon,
} from "lucide-react";

import { extractIdFromParam, roommateHref } from "@/lib/slug";
import { useAuth } from "@/lib/providers/auth-provider";
import { useCurrency } from "@/lib/providers/currency-provider";
import { formatPrice } from "@/lib/currency";
import { avatarFallback } from "@/lib/fallback-image";
import { appLink } from "@/lib/app-links";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile, RoommateProfile } from "@/lib/types/database";

import { SiteShell } from "@/components/site-shell";
import { OpenInApp } from "@/components/open-in-app";
import { ShareButton } from "@/components/share-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Poster = Pick<Profile, "name" | "avatar_url" | "phone"> | null;

/**
 * A roommate listing's own page.
 *
 * Roommates used to exist only as a card and a modal on the homepage, which
 * meant a listing had no address: it could not be shared, linked to, opened
 * from the app, or found again after closing the popup. Properties and
 * services already work this way, so this follows them rather than inventing a
 * second pattern, down to reading the same encoded id out of the URL.
 */
export default function RoommateProfilePage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => extractIdFromParam(params?.id), [params?.id]);
  const supabase = getSupabaseBrowserClient();
  const { user } = useAuth();
  const { convert, display } = useCurrency();

  const [item, setItem] = useState<RoommateProfile | null>(null);
  const [poster, setPoster] = useState<Poster>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // An unreadable id still resolves the loading state, just with no row,
      // so the "no longer listed" copy is what a bad link lands on.
      if (!id) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("roommate_profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      const row = (data as RoommateProfile) ?? null;

      // Two queries rather than an embedded join, which is how the homepage
      // tab reads the same pair.
      let who: Poster = null;
      if (row) {
        const { data: p } = await supabase
          .from("profiles")
          .select("name, avatar_url, phone")
          .eq("id", row.user_id)
          .maybeSingle();
        who = (p as Poster) ?? null;
      }

      if (!cancelled) {
        setItem(row);
        setPoster(who);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, supabase]);

  if (loading) {
    return (
      <SiteShell>
        <div className="container mx-auto max-w-4xl space-y-4 px-4 py-8">
          <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </SiteShell>
    );
  }

  if (!item) {
    return (
      <SiteShell>
        <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">This profile is no longer listed</h1>
          <p className="mt-2 text-muted-foreground">
            It may have been taken down, or the person has already found a room.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">Browse roommates</Link>
          </Button>
        </div>
      </SiteShell>
    );
  }

  const name = poster?.name ?? "SafeHome member";
  const images = (item.images ?? []) as string[];
  const hero = images[0] ?? avatarFallback(name);
  const seeking = item.profile_type === "seeking";
  const currency = item.currency ?? "GBP";

  const price = seeking
    ? item.budget_min && item.budget_max
      ? `${formatPrice(convert(Number(item.budget_min), currency), display)} - ${formatPrice(
          convert(Number(item.budget_max), currency),
          display
        )}`
      : null
    : item.rent_amount
      ? formatPrice(convert(Number(item.rent_amount), currency), display)
      : null;

  const where = [item.city, item.state, item.country].filter(Boolean).join(", ");

  return (
    <SiteShell>
      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div className="relative overflow-hidden rounded-2xl bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero} alt={name} className="aspect-[16/10] w-full object-cover" />
          <Badge className="absolute left-4 top-4 bg-primary text-primary-foreground">
            {seeking ? "Seeking Room" : "Offering Room"}
          </Badge>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-14">
              <AvatarImage src={poster?.avatar_url ?? undefined} />
              <AvatarFallback>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarFallback(name)} alt="" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold">
                {name}
                {item.age ? `, ${item.age}` : ""}
              </h1>
              {where && (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" /> {where}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ShareButton
              href={roommateHref({ id: item.id, name })}
              title={name}
              text={`${name} is looking for a room on SafeHome`}
              stopPropagation={false}
            />
            {user && user.id !== item.user_id && (
              <Button asChild>
                <Link href={`/messages/${item.user_id}`}>
                  <MessageCircle className="size-4" /> Message
                </Link>
              </Button>
            )}
          </div>
        </div>

        {item.title && <p className="text-lg font-medium">{item.title}</p>}

        {price && (
          <div>
            <div className="text-xs text-muted-foreground">
              {seeking ? "Budget" : "Rent"}
            </div>
            <div className="text-2xl font-bold text-amber-600">{price}</div>
          </div>
        )}

        {item.bio && (
          <Card className="p-5">
            <h2 className="mb-2 font-semibold">About</h2>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{item.bio}</p>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {item.occupation && (
            <Tile
              icon={<Briefcase className="size-4" />}
              label="Occupation"
              value={item.occupation}
            />
          )}
          {item.gender && (
            <Tile icon={<UserIcon className="size-4" />} label="Gender" value={item.gender} />
          )}
          {item.room_type && (
            <Tile icon={<Bed className="size-4" />} label="Room" value={item.room_type} />
          )}
          {item.move_in_date && (
            <Tile
              icon={<CalendarDays className="size-4" />}
              label="Move in"
              value={new Date(item.move_in_date).toLocaleDateString()}
            />
          )}
        </div>

        {/* The app shows a roommate listing on the poster's profile, so that is
            where a hand-off lands - it has no roommate route of its own. */}
        <OpenInApp deepLink={appLink.roommate(item.user_id)} label="this profile" />
      </div>
    </SiteShell>
  );
}

function Tile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 text-sm font-medium capitalize">{value}</div>
    </Card>
  );
}
