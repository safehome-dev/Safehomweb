"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  Bed,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Flag,
  Heart,
  Loader2,
  MessageCircle,
  Phone,
  User as UserIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type { Profile, RoommateProfile } from "@/lib/types/database";
import { useAuth } from "@/lib/providers/auth-provider";
import { useCurrency } from "@/lib/providers/currency-provider";
import { formatPrice } from "@/lib/currency";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { avatarFallback } from "@/lib/fallback-image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  profile: RoommateProfile & { profile?: Pick<Profile, "name" | "avatar_url" | "phone"> | null };
  onSkip?: () => void;
  onLiked?: () => void;
  onBlocked?: () => void;
}

function maskPhone(phone: string | null | undefined) {
  if (!phone) return null;
  // Show first 3 + last 3, mask the middle (mirrors mobile behaviour).
  return phone.replace(/(\d{3})(\d+)(\d{3})/, "$1****$3");
}

export function RoommateCard({ profile, onSkip, onLiked, onBlocked }: Props) {
  const { user } = useAuth();
  const { convert, display } = useCurrency();
  const supabase = getSupabaseBrowserClient();
  const [open, setOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [working, setWorking] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const images = (profile.images ?? []) as string[];
  const galleryImages =
    images.length > 0
      ? images
      : profile.profile?.avatar_url
        ? [profile.profile.avatar_url]
        : [avatarFallback(profile.profile?.name ?? profile.title)];
  const cardImage = galleryImages[0];
  const heroImage = galleryImages[imageIndex] ?? cardImage;
  const name = profile.profile?.name ?? "User";

  async function sendLike(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!user) {
      toast.error("Please login to like roommates");
      return;
    }
    setWorking(true);
    const message = `Hi ${name}! I'm interested in your roommate profile "${profile.title}". I'd love to connect! 🏠`;
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: profile.user_id,
      message,
      is_read: false,
      message_status: "sent",
    });
    setWorking(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLiked(true);
    onLiked?.();
    toast.success("Message sent!");
  }

  async function report(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!user) {
      toast.error("Please login to report");
      return;
    }
    await supabase.from("content_reports").insert({
      reporter_id: user.id,
      reported_user_id: profile.user_id,
      target_type: "roommate_profile",
      target_id: profile.id,
      reason: "Other safety concern",
    });
    toast.success("Reported. SafeHome will review within 24 hours.");
  }

  async function block(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!user) {
      toast.error("Please login to block users");
      return;
    }
    if (!confirm(`Block ${name}? They will be removed from your roommate feed and SafeHome will be notified.`)) {
      return;
    }
    setWorking(true);
    const { error: blockErr } = await supabase.from("user_blocks").insert({
      blocker_id: user.id,
      blocked_user_id: profile.user_id,
      reason: "Blocked from roommate feed",
    });
    if (blockErr) {
      setWorking(false);
      toast.error(blockErr.message);
      return;
    }
    await supabase.from("content_reports").insert({
      reporter_id: user.id,
      reported_user_id: profile.user_id,
      target_type: "roommate_profile",
      target_id: profile.id,
      reason: "Other safety concern",
      auto_blocked: true,
    });
    setWorking(false);
    setOpen(false);
    onBlocked?.();
    toast.success("User blocked.");
  }

  const priceBlock = (() => {
    if (profile.profile_type === "seeking") {
      if (profile.budget_min || profile.budget_max) {
        const lo = profile.budget_min
          ? formatPrice(convert(Number(profile.budget_min), profile.currency), display)
          : "";
        const hi = profile.budget_max
          ? formatPrice(convert(Number(profile.budget_max), profile.currency), display)
          : "";
        return [lo, hi].filter(Boolean).join("–");
      }
    } else if (profile.rent_amount) {
      return formatPrice(convert(Number(profile.rent_amount), profile.currency), display);
    }
    return null;
  })();

  // Carousel navigation
  const goPrev = useCallback(() => {
    setImageIndex((i) =>
      galleryImages.length <= 1 ? i : (i - 1 + galleryImages.length) % galleryImages.length
    );
  }, [galleryImages.length]);

  const goNext = useCallback(() => {
    setImageIndex((i) =>
      galleryImages.length <= 1 ? i : (i + 1) % galleryImages.length
    );
  }, [galleryImages.length]);

  // Keyboard nav in lightbox
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, goPrev, goNext]);

  // Reset to first image whenever the modal reopens
  useEffect(() => {
    if (open) setImageIndex(0);
  }, [open]);

  return (
    <>
      {/* Card */}
      <Card
        onClick={() => setOpen(true)}
        className="overflow-hidden p-0 cursor-pointer hover:shadow-lg transition-shadow"
      >
        <div className="relative aspect-[3/4] bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardImage} alt={name} className="size-full object-cover" loading="lazy" />
          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
            {profile.profile_type === "seeking" ? "Seeking Room" : "Offering Room"}
          </Badge>
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
            <div className="font-semibold text-lg">
              {name}
              {profile.age ? `, ${profile.age}` : ""}
            </div>
            <div className="text-xs opacity-90 line-clamp-1">
              📍 {profile.city}, {profile.country}
            </div>
            <div className="text-sm font-medium line-clamp-1 mt-1">{profile.title}</div>
            {profile.bio && (
              <div className="text-xs opacity-80 line-clamp-2">{profile.bio}</div>
            )}
            {priceBlock && (
              <div className="text-sm font-semibold mt-1">{priceBlock}</div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-around p-2 border-t bg-card">
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onSkip?.();
            }}
            aria-label="Skip"
          >
            <X className="size-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={report}
            aria-label="Report"
          >
            <Flag className="size-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={liked || working}
            onClick={sendLike}
            aria-label="Like"
          >
            <Heart
              className={`size-5 ${liked ? "fill-red-500 text-red-500" : "text-red-500"}`}
            />
          </Button>
        </div>
      </Card>

      {/* Detail modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 max-h-[90vh] flex flex-col">
          {/* Image carousel */}
          <div className="relative aspect-[4/3] bg-muted shrink-0">
            <button
              type="button"
              onClick={() => setLightbox(true)}
              aria-label="View full image"
              className="absolute inset-0 cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage}
                alt={name}
                className="size-full object-cover"
              />
            </button>
            <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground pointer-events-none">
              {profile.profile_type === "seeking" ? "Looking for Room" : "Offering Room"}
            </Badge>
            {galleryImages.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white shadow"
                >
                  <ChevronLeft className="size-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white shadow"
                >
                  <ChevronRight className="size-5" />
                </Button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-none">
                  {galleryImages.map((_, i) => (
                    <span
                      key={i}
                      className={`size-1.5 rounded-full transition-all ${
                        i === imageIndex ? "w-4 bg-white" : "bg-white/60"
                      }`}
                    />
                  ))}
                </div>
                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/60 text-white text-xs pointer-events-none">
                  {imageIndex + 1} / {galleryImages.length}
                </div>
              </>
            )}
          </div>

          {/* Body */}
          <div className="overflow-y-auto p-5 space-y-4">
            {/* Profile header */}
            <div className="flex items-center gap-3">
              <Avatar className="size-14">
                <AvatarImage src={profile.profile?.avatar_url ?? undefined} />
                <AvatarFallback>
                  <img src={avatarFallback(name)} alt="" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-semibold text-lg line-clamp-1">{name}</div>
                {profile.occupation && (
                  <div className="text-sm text-muted-foreground inline-flex items-center gap-1">
                    <Briefcase className="size-3.5" /> {profile.occupation}
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold leading-tight">{profile.title}</h2>

            {/* Location */}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              📍 {profile.city}
              {profile.state ? `, ${profile.state}` : ""}, {profile.country}
            </div>

            {/* Phone */}
            {profile.profile?.phone && (
              <a
                href={user ? `tel:${profile.profile.phone}` : undefined}
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    toast.error("Please login to view the phone number");
                  }
                }}
                className="flex items-center gap-2 text-primary font-medium hover:underline"
              >
                <Phone className="size-4" />
                <span className="underline-offset-2">
                  {user ? profile.profile.phone : maskPhone(profile.profile.phone)}
                </span>
              </a>
            )}

            {/* Price */}
            {priceBlock && (
              <div className="rounded-lg bg-accent p-4">
                <div className="text-xs text-muted-foreground">
                  {profile.profile_type === "seeking" ? "Budget" : "Rent"}
                </div>
                <div className="text-2xl font-bold text-amber-600">{priceBlock}</div>
              </div>
            )}

            {/* Safety actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={report}
                disabled={working}
                className="gap-2 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800"
              >
                <Flag className="size-4" /> Report
              </Button>
              <Button
                variant="outline"
                onClick={block}
                disabled={working}
                className="gap-2 border-destructive/40 bg-destructive/5 hover:bg-destructive/10 text-destructive"
              >
                <Ban className="size-4" /> Block user
              </Button>
            </div>

            {/* Details grid */}
            {(profile.age || profile.gender || profile.room_type || profile.move_in_date) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {profile.age != null && (
                  <DetailTile label="Age" value={`${profile.age} yrs`} />
                )}
                {profile.gender && (
                  <DetailTile
                    label="Gender"
                    value={profile.gender.replace(/-/g, " ")}
                    Icon={UserIcon}
                  />
                )}
                {profile.room_type && (
                  <DetailTile
                    label="Room type"
                    value={profile.room_type}
                    Icon={Bed}
                  />
                )}
                {profile.move_in_date && (
                  <DetailTile label="Move-in" value={profile.move_in_date} />
                )}
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <section className="space-y-1">
                <h3 className="font-semibold text-sm">About</h3>
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {profile.bio}
                </p>
              </section>
            )}

            {/* Primary CTA */}
            <Button
              className="w-full gap-2 h-11"
              onClick={() => sendLike()}
              disabled={liked || working}
            >
              {working ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MessageCircle className="size-4" />
              )}
              {liked ? "Message sent" : "Send message"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen image viewer */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <Button
            variant="secondary"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(false);
            }}
            aria-label="Close"
            className="absolute top-4 right-4 rounded-full bg-white/90 hover:bg-white shadow"
          >
            <X className="size-5" />
          </Button>
          {galleryImages.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white shadow"
              >
                <ChevronLeft className="size-6" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                aria-label="Next image"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white shadow"
              >
                <ChevronRight className="size-6" />
              </Button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/70 text-white text-sm">
                {imageIndex + 1} / {galleryImages.length}
              </div>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt={name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] max-w-[95vw] object-contain"
          />
        </div>
      )}
    </>
  );
}

function DetailTile({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon?: React.ElementType;
}) {
  return (
    <div className="rounded-lg bg-muted p-3 text-center">
      {Icon && <Icon className="size-4 mx-auto text-muted-foreground mb-1" />}
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-semibold capitalize">{value}</div>
    </div>
  );
}
