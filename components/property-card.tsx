"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, BedDouble, Bath, Camera, Share2, Box, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { Property } from "@/lib/types/database";
import { useAuth } from "@/lib/providers/auth-provider";
import { useCurrency } from "@/lib/providers/currency-provider";
import { formatPrice } from "@/lib/currency";
import { propertyFallbackImage } from "@/lib/fallback-image";
import { propertyHref } from "@/lib/slug";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  property: Property;
  onRemove?: () => void;
  removable?: boolean;
}

export function PropertyCard({ property, onRemove, removable }: Props) {
  const { user } = useAuth();
  const { convert, display } = useCurrency();
  const supabase = getSupabaseBrowserClient();
  const [favorite, setFavorite] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("wishlists")
        .select("id")
        .eq("user_id", user.id)
        .eq("property_id", property.id)
        .maybeSingle();
      setFavorite(!!data);
    })();
  }, [user, property.id, supabase]);

  const images = (property.images ?? []) as string[];
  const hero = images[0] ?? propertyFallbackImage(property.title, property.location_city);
  const photoCount = images.length;

  const statusLabel =
    property.rental_type === "rent"
      ? "For Rent"
      : property.rental_type === "sale"
        ? "For Sale"
        : "Available";

  const priceTarget = convert(Number(property.price), property.currency ?? "GBP");

  async function toggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Please login to add properties to your wishlist");
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
      await supabase.from("wishlists").insert({ user_id: user.id, property_id: property.id });
      setFavorite(true);
      toast.success("Added to wishlist");
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
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
  }

  return (
    <Card className="group overflow-hidden p-0 hover:shadow-lg transition-shadow">
      <Link href={propertyHref(property)} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero}
            alt={property.title}
            className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute top-3 left-3">
            <Badge className="bg-primary text-primary-foreground shadow">{statusLabel}</Badge>
          </div>
          <button
            onClick={toggleFavorite}
            disabled={working}
            aria-label="Toggle favorite"
            className="absolute top-3 right-3 size-10 rounded-full bg-white/95 hover:bg-white grid place-items-center shadow disabled:opacity-60"
          >
            <Heart
              className={`size-5 ${favorite ? "fill-red-500 text-red-500" : "text-slate-700"}`}
            />
          </button>
          {photoCount > 1 && (
            <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 text-white text-xs">
              <Camera className="size-3.5" />
              {photoCount} photos
            </div>
          )}
        </div>

        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-base line-clamp-1">{property.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-1">
            📍 {property.location_city}
            {property.location_state ? `, ${property.location_state}` : ""}, {property.location_country}
          </p>
          <div className="flex items-center justify-between pt-1">
            <div className="text-lg font-bold text-primary">
              {formatPrice(priceTarget, display)}
              {property.rental_type === "rent" && (
                <span className="text-xs text-muted-foreground font-normal"> /mo</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <BedDouble className="size-4" /> {property.bedrooms}
              </span>
              <span className="inline-flex items-center gap-1">
                <Bath className="size-4" /> {property.bathrooms}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={share} aria-label="Share">
                <Share2 className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleFavorite}
                aria-label="Bookmark"
              >
                <Heart className={`size-4 ${favorite ? "fill-primary text-primary" : ""}`} />
              </Button>
              <Button size="icon" variant="ghost" aria-label="3D tour" disabled>
                <Box className="size-4" />
              </Button>
              {removable && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove?.();
                  }}
                  aria-label="Remove from wishlist"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              )}
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </div>
        </div>
      </Link>
    </Card>
  );
}
