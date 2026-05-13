"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Star, BadgeCheck, MessageCircle, MapPin } from "lucide-react";

import { SiteShell } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCurrency } from "@/lib/providers/currency-provider";
import { formatPrice } from "@/lib/currency";
import { avatarFallback } from "@/lib/fallback-image";
import type { Profile, ServiceProvider } from "@/lib/types/database";

export default function ServiceProviderPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = getSupabaseBrowserClient();
  const { user } = useAuth();
  const { convert, display } = useCurrency();
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("service_providers")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      const p = data as ServiceProvider | null;
      setProvider(p);
      if (p?.user_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", p.user_id)
          .maybeSingle();
        setProfile(profileData as Profile | null);
      }
      setLoading(false);
    })();
  }, [id, supabase]);

  if (loading) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-8 space-y-4">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      </SiteShell>
    );
  }

  if (!provider) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          Service provider not found.
        </div>
      </SiteShell>
    );
  }

  const portfolio = provider.portfolio_images ?? [];
  const hero =
    portfolio[0] ??
    `https://source.unsplash.com/featured/?${encodeURIComponent(
      (provider.service_categories ?? [])[0] ?? "service"
    )}`;
  const rate = provider.hourly_rate
    ? convert(Number(provider.hourly_rate), provider.currency)
    : null;

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="aspect-video bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero} alt={provider.business_name} className="size-full object-cover" />
            </div>
          </Card>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {provider.business_name}
              {provider.is_verified && (
                <Badge className="bg-success text-white gap-1">
                  <BadgeCheck className="size-3.5" /> Verified
                </Badge>
              )}
            </h1>
            <div className="text-muted-foreground inline-flex items-center gap-1">
              <MapPin className="size-4" /> {provider.city}, {provider.country}
            </div>
            <div className="inline-flex items-center gap-1 text-amber-500">
              <Star className="size-4 fill-amber-500" />
              <span className="font-medium text-foreground">
                {Number(provider.average_rating ?? 0).toFixed(1)}
              </span>
              <span className="text-muted-foreground">
                ({provider.total_reviews ?? 0} reviews)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(provider.service_categories ?? []).map((cat) => (
                <Badge key={cat} variant="secondary" className="capitalize">{cat}</Badge>
              ))}
            </div>
          </div>

          {provider.bio && (
            <section>
              <h2 className="font-semibold mb-2">About</h2>
              <p className="text-sm whitespace-pre-line">{provider.bio}</p>
            </section>
          )}

          {portfolio.length > 1 && (
            <section>
              <h2 className="font-semibold mb-2">Portfolio</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {portfolio.slice(0, 9).map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="aspect-square w-full object-cover rounded-md"
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="p-5 space-y-4 sticky top-20">
            {rate !== null && (
              <div className="text-3xl font-bold text-primary">
                {formatPrice(rate, display)}
                <span className="text-sm text-muted-foreground font-normal"> /hr</span>
              </div>
            )}
            {profile && (
              <Link
                href={`/u/${profile.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent"
              >
                <Avatar>
                  <AvatarImage src={profile.avatar_url ?? undefined} />
                  <AvatarFallback>
                    <img src={avatarFallback(profile.name)} alt="" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Provider</div>
                  <div className="font-medium line-clamp-1">{profile.name ?? "Provider"}</div>
                </div>
              </Link>
            )}
            {profile && user && user.id !== profile.id && (
              <Link href={`/messages/${profile.id}`}>
                <Button className="w-full gap-2">
                  <MessageCircle className="size-4" /> Message
                </Button>
              </Link>
            )}
            <Link href={`/services/${provider.id}/book`}>
              <Button variant="secondary" className="w-full">Book service</Button>
            </Link>
          </Card>
        </aside>
      </div>
    </SiteShell>
  );
}
