"use client";

import Link from "next/link";
import { Star, BadgeCheck } from "lucide-react";

import type { ServiceProvider, Profile } from "@/lib/types/database";
import { useCurrency } from "@/lib/providers/currency-provider";
import { formatPrice } from "@/lib/currency";
import { avatarFallback } from "@/lib/fallback-image";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface Props {
  provider: ServiceProvider & { profile?: Pick<Profile, "name" | "avatar_url"> | null };
}

export function ServiceCard({ provider }: Props) {
  const { convert, display } = useCurrency();
  const portfolioImage =
    (provider.portfolio_images ?? [])[0] ??
    `https://source.unsplash.com/featured/?${encodeURIComponent(
      (provider.service_categories ?? [])[0] ?? "service"
    )}`;
  const hourly = provider.hourly_rate
    ? convert(Number(provider.hourly_rate), provider.currency || "GBP")
    : null;

  return (
    <Link href={`/services/${provider.id}`}>
      <Card className="overflow-hidden p-0 hover:shadow-lg transition-shadow h-full">
        <div className="relative aspect-[16/10] bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={portfolioImage} alt={provider.business_name} className="size-full object-cover" loading="lazy" />
          {provider.is_verified && (
            <Badge className="absolute top-3 left-3 bg-success text-white gap-1">
              <BadgeCheck className="size-3.5" /> Verified
            </Badge>
          )}
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage src={provider.profile?.avatar_url ?? undefined} />
              <AvatarFallback>
                <img src={avatarFallback(provider.profile?.name ?? provider.business_name)} alt="" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-semibold line-clamp-1">{provider.business_name}</div>
              <div className="text-xs text-muted-foreground line-clamp-1">
                📍 {provider.city}, {provider.country}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(provider.service_categories ?? []).slice(0, 3).map((cat) => (
              <Badge key={cat} variant="secondary" className="capitalize">
                {cat}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="inline-flex items-center gap-1 text-amber-500">
              <Star className="size-4 fill-amber-500" />
              <span className="font-medium text-foreground">
                {Number(provider.average_rating ?? 0).toFixed(1)}
              </span>
              <span className="text-muted-foreground">
                ({provider.total_reviews ?? 0})
              </span>
            </div>
            {hourly !== null && (
              <span className="font-semibold text-primary">
                {formatPrice(hourly, display)}/hr
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
