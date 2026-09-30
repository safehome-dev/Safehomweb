"use client";

import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";

import type { ServiceProvider, Profile } from "@/lib/types/database";
import { useCurrency } from "@/lib/providers/currency-provider";
import { formatPrice } from "@/lib/currency";
import { serviceHref } from "@/lib/slug";

import { ShareButton } from "@/components/share-button";

interface Props {
  provider: ServiceProvider & { profile?: Pick<Profile, "name" | "avatar_url"> | null };
}

/**
 * A provider, shaped like the property tile so a mixed page reads as one grid.
 *
 * The rating sits on the title line rather than in a row of its own, which is
 * what keeps the caption to the same three lines the other tiles use.
 */
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

  const rating = Number(provider.average_rating ?? 0);
  const categories = (provider.service_categories ?? []).slice(0, 3).join(" · ");
  const where = [provider.city, provider.country].filter(Boolean).join(", ");

  return (
    <Link href={serviceHref(provider)} className="group block">
      <div className="relative aspect-[20/19] overflow-hidden rounded-2xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={portfolioImage}
          alt={provider.business_name}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {provider.is_verified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-900 shadow-sm">
            <BadgeCheck className="size-3.5 text-success" /> Verified
          </span>
        )}

        <div className="absolute right-2.5 top-2.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100">
          <ShareButton
            href={serviceHref(provider)}
            title={provider.business_name}
            text={`${provider.business_name} on SafeHome`}
            className="size-8 rounded-full bg-white/90 shadow-sm backdrop-blur hover:bg-white"
          />
        </div>
      </div>

      <div className="pt-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-[15px] font-medium">{provider.business_name}</h3>
          {rating > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 text-sm">
              <Star className="size-3.5 fill-foreground text-foreground" />
              {rating.toFixed(1)}
            </span>
          )}
        </div>
        {where && <p className="truncate text-sm text-muted-foreground">{where}</p>}
        {categories && (
          <p className="truncate text-sm capitalize text-muted-foreground">{categories}</p>
        )}
        {hourly !== null && (
          <p className="pt-1 text-[15px]">
            <span className="font-semibold">{formatPrice(hourly, display)}</span>
            <span className="text-muted-foreground"> / hour</span>
          </p>
        )}
      </div>
    </Link>
  );
}
