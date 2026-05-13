"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BedDouble, Bath, Home as HomeIcon, MapPin, MessageCircle, Heart, Calendar } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/providers/auth-provider";
import { useCurrency } from "@/lib/providers/currency-provider";
import { formatPrice } from "@/lib/currency";
import { avatarFallback, propertyFallbackImage } from "@/lib/fallback-image";
import type { Profile, Property, Review } from "@/lib/types/database";

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const { user } = useAuth();
  const { convert, display } = useCurrency();
  const [property, setProperty] = useState<Property | null>(null);
  const [lister, setLister] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      const p = data as Property | null;
      setProperty(p);
      if (p?.lister_id) {
        const { data: listerData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", p.lister_id)
          .maybeSingle();
        setLister(listerData as Profile | null);
      }
      const { data: reviewData } = await supabase
        .from("reviews")
        .select("*")
        .eq("property_id", id)
        .order("created_at", { ascending: false });
      setReviews((reviewData ?? []) as Review[]);
      setLoading(false);
    })();
  }, [id, supabase]);

  useEffect(() => {
    if (!user || !property) return;
    (async () => {
      const { data } = await supabase
        .from("wishlists")
        .select("id")
        .eq("user_id", user.id)
        .eq("property_id", property.id)
        .maybeSingle();
      setFavorite(!!data);
    })();
  }, [user, property, supabase]);

  async function toggleFavorite() {
    if (!user) {
      toast.error("Please login to save properties");
      return;
    }
    if (!property) return;
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
      toast.success("Saved to wishlist");
    }
  }

  if (loading) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-8 space-y-4">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </SiteShell>
    );
  }

  if (!property) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          Property not found.
          <div className="mt-4">
            <Link href="/"><Button variant="outline">Back home</Button></Link>
          </div>
        </div>
      </SiteShell>
    );
  }

  const images = (property.images ?? []) as string[];
  const fallbackHero = propertyFallbackImage(property.title, property.location_city);
  const hero = images[activeImage] ?? fallbackHero;
  const priceTarget = convert(Number(property.price), property.currency ?? "GBP");
  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length
    : null;

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="relative aspect-video bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero} alt={property.title} className="size-full object-cover" />
              <Badge className="absolute top-4 left-4 bg-primary">
                {property.rental_type === "rent"
                  ? "For Rent"
                  : property.rental_type === "sale"
                    ? "For Sale"
                    : "Available"}
              </Badge>
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-2">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`relative size-20 shrink-0 rounded-md overflow-hidden border-2 ${
                      i === activeImage ? "border-primary" : "border-transparent"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </Card>

          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold">{property.title}</h1>
            <div className="flex items-center text-muted-foreground gap-1">
              <MapPin className="size-4" /> {property.location_address}, {property.location_city}
              {property.location_state ? `, ${property.location_state}` : ""}, {property.location_country}
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Badge variant="secondary" className="gap-1">
                <BedDouble className="size-3.5" /> {property.bedrooms} bedrooms
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Bath className="size-3.5" /> {property.bathrooms} bathrooms
              </Badge>
              <Badge variant="secondary" className="gap-1 capitalize">
                <HomeIcon className="size-3.5" /> {property.property_type}
              </Badge>
            </div>
          </div>

          <Separator />

          <section>
            <h2 className="font-semibold mb-2">About this property</h2>
            <p className="text-sm whitespace-pre-line leading-relaxed">{property.description}</p>
          </section>

          {(property.amenities ?? []).length > 0 && (
            <section>
              <h2 className="font-semibold mb-2">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {(property.amenities ?? []).map((a) => (
                  <Badge key={a} variant="outline" className="capitalize">{a}</Badge>
                ))}
              </div>
            </section>
          )}

          {property.rules && (
            <section>
              <h2 className="font-semibold mb-2">House rules</h2>
              <p className="text-sm whitespace-pre-line">{property.rules}</p>
            </section>
          )}

          {(property.available_from || property.available_to) && (
            <section>
              <h2 className="font-semibold mb-2 flex items-center gap-2">
                <Calendar className="size-4" /> Availability
              </h2>
              <p className="text-sm text-muted-foreground">
                {property.available_from ?? "—"} → {property.available_to ?? "—"}
              </p>
            </section>
          )}

          <Separator />

          <section>
            <h2 className="font-semibold mb-3">
              Reviews{avgRating !== null && (
                <span className="text-sm text-muted-foreground ml-2">
                  {avgRating.toFixed(1)} · {reviews.length}
                </span>
              )}
            </h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              <div className="space-y-3">
                {reviews.slice(0, 5).map((r) => (
                  <Card key={r.id} className="p-3 text-sm">
                    <div className="font-medium">{"★".repeat(r.rating ?? 0)}</div>
                    {r.comment && <div className="text-muted-foreground mt-1">{r.comment}</div>}
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <Card className="p-5 space-y-4 sticky top-20">
            <div className="text-3xl font-bold text-primary">
              {formatPrice(priceTarget, display)}
              {property.rental_type === "rent" && (
                <span className="text-sm text-muted-foreground font-normal"> /month</span>
              )}
            </div>
            {lister && (
              <Link
                href={`/u/${lister.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition"
              >
                <Avatar>
                  <AvatarImage src={lister.avatar_url ?? undefined} />
                  <AvatarFallback>
                    <img src={avatarFallback(lister.name)} alt="" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Listed by</div>
                  <div className="font-medium line-clamp-1">{lister.name ?? "Lister"}</div>
                </div>
              </Link>
            )}
            <Button
              onClick={() => {
                if (!user) {
                  toast.error("Please sign in to message");
                  router.push("/login");
                  return;
                }
                if (lister) router.push(`/messages/${lister.id}`);
              }}
              className="w-full gap-2"
            >
              <MessageCircle className="size-4" /> Message lister
            </Button>
            <Button
              variant="outline"
              onClick={toggleFavorite}
              className="w-full gap-2"
            >
              <Heart className={`size-4 ${favorite ? "fill-red-500 text-red-500" : ""}`} />
              {favorite ? "Saved" : "Save to wishlist"}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                if (!user) {
                  router.push("/login");
                  return;
                }
                router.push(`/property/${property.id}/book`);
              }}
            >
              Book property
            </Button>
          </Card>
        </aside>
      </div>
    </SiteShell>
  );
}
