"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { Property } from "@/lib/types/database";
import { useAuth } from "@/lib/providers/auth-provider";
import { useCurrency } from "@/lib/providers/currency-provider";
import { formatPrice } from "@/lib/currency";
import { propertyFallbackImage } from "@/lib/fallback-image";
import { propertyHref } from "@/lib/slug";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface Props {
  property: Property;
  onRemove?: () => void;
  removable?: boolean;
}

/**
 * A listing, as a picture with a caption.
 *
 * There is deliberately no card: no border, no panel, no shadow, no divider
 * rule. Chrome around every tile is what makes a grid look busy, and once
 * twenty-four of them are on screen the borders are the loudest thing there.
 * The photograph carries the card and the text sits quietly underneath it,
 * which is the arrangement every listings site converges on.
 *
 * Actions live on the image rather than in a row beneath it, so the caption
 * stays three calm lines of fact and the buttons are next to the thing they
 * act on.
 */
export function PropertyCard({ property, onRemove, removable }: Props) {
  const { user } = useAuth();
  const { convert, display } = useCurrency();
  const supabase = getSupabaseBrowserClient();
  const [favorite, setFavorite] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("wishlists")
        .select("id")
        .eq("user_id", user.id)
        .eq("property_id", property.id)
        .maybeSingle();
      if (!cancelled) setFavorite(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, property.id, supabase]);

  const images = (property.images ?? []) as string[];
  const hero =
    images[0] ?? propertyFallbackImage(property.title, property.location_city);

  // Only badge a listing when the badge distinguishes it. Every listing in the
  // database is rental_type 'any', so an "Available" pill rendered on all of
  // them was pure decoration - it cost a corner of every photograph to say
  // nothing. Rent and sale are worth calling out; nothing else is.
  const statusLabel =
    property.rental_type === "rent"
      ? "For rent"
      : property.rental_type === "sale"
        ? "For sale"
        : null;

  const priceTarget = convert(Number(property.price), property.currency ?? "GBP");

  const where = [property.location_city, property.location_country]
    .filter(Boolean)
    .join(", ");

  const rooms = [
    property.bedrooms ? `${property.bedrooms} bed${property.bedrooms > 1 ? "s" : ""}` : null,
    property.bathrooms ? `${property.bathrooms} bath${property.bathrooms > 1 ? "s" : ""}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  async function toggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Please log in to save properties");
      return;
    }
    setWorking(true);
    if (favorite) {
      await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", user.id)
        .eq("property_id", property.id);
      setFavorite(false);
    } else {
      await supabase
        .from("wishlists")
        .insert({ user_id: user.id, property_id: property.id });
      setFavorite(true);
      toast.success("Saved");
    }
    setWorking(false);
  }

  async function share(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${propertyHref(property)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: property.title, url });
      } catch {
        // Dismissing the sheet lands here too.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  }

  return (
    <Link href={propertyHref(property)} className="group block">
      <div className="relative aspect-[20/19] overflow-hidden rounded-2xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hero}
          alt={property.title}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {statusLabel && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-900 shadow-sm">
            {statusLabel}
          </span>
        )}

        {/* Icon buttons stay legible over any photograph: a translucent white
            disc rather than a bare glyph, which disappears on pale images. */}
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
          <IconButton
            onClick={share}
            label={`Share ${property.title}`}
            className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100"
          >
            <Share2 className="size-4 text-slate-700" />
          </IconButton>

          {removable ? (
            <IconButton
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove?.();
              }}
              label="Remove from wishlist"
            >
              <Trash2 className="size-4 text-destructive" />
            </IconButton>
          ) : (
            <IconButton onClick={toggleFavorite} disabled={working} label="Save">
              <Heart
                className={
                  favorite ? "size-4 fill-red-500 text-red-500" : "size-4 text-slate-700"
                }
              />
            </IconButton>
          )}
        </div>
      </div>

      <div className="pt-3">
        <h3 className="truncate text-[15px] font-medium text-foreground">
          {property.title}
        </h3>
        {where && (
          <p className="truncate text-sm text-muted-foreground">{where}</p>
        )}
        {rooms && <p className="truncate text-sm text-muted-foreground">{rooms}</p>}
        <p className="pt-1 text-[15px] text-foreground">
          <span className="font-semibold">{formatPrice(priceTarget, display)}</span>
          {property.rental_type === "rent" && (
            <span className="text-muted-foreground"> / month</span>
          )}
        </p>
      </div>
    </Link>
  );
}

function IconButton({
  children,
  onClick,
  label,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`grid size-8 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-colors hover:bg-white disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}
