"use client";

import { useState } from "react";
import { Heart, X, Flag, MessageCircle } from "lucide-react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  profile: RoommateProfile & { profile?: Pick<Profile, "name" | "avatar_url" | "phone"> | null };
  onSkip?: () => void;
  onLiked?: () => void;
}

export function RoommateCard({ profile, onSkip, onLiked }: Props) {
  const { user } = useAuth();
  const { convert, display } = useCurrency();
  const supabase = getSupabaseBrowserClient();
  const [open, setOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [working, setWorking] = useState(false);

  const image =
    (profile.images ?? [])[0] ??
    profile.profile?.avatar_url ??
    avatarFallback(profile.profile?.name ?? profile.title);
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
    toast.success("Reported. Our team will review.");
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

  return (
    <>
      <Card
        onClick={() => setOpen(true)}
        className="overflow-hidden p-0 cursor-pointer hover:shadow-lg transition-shadow"
      >
        <div className="relative aspect-[3/4] bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={name} className="size-full object-cover" loading="lazy" />
          <Badge className="absolute top-3 left-3 bg-brand text-white">
            {profile.profile_type === "seeking" ? "Seeking Room" : "Has Room"}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{profile.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarImage src={profile.profile?.avatar_url ?? undefined} />
                <AvatarFallback>
                  <img src={avatarFallback(name)} alt="" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">
                  {name}
                  {profile.age ? `, ${profile.age}` : ""}
                  {profile.gender ? ` · ${profile.gender}` : ""}
                </div>
                <div className="text-sm text-muted-foreground">
                  📍 {profile.city}, {profile.country}
                  {profile.occupation ? ` · ${profile.occupation}` : ""}
                </div>
              </div>
            </div>
            {profile.bio && <p className="text-sm">{profile.bio}</p>}
            {priceBlock && (
              <div className="text-sm font-semibold text-primary">{priceBlock}</div>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {profile.room_type && (
                <div>
                  <div className="text-muted-foreground text-xs">Room type</div>
                  <div className="font-medium capitalize">{profile.room_type}</div>
                </div>
              )}
              {profile.move_in_date && (
                <div>
                  <div className="text-muted-foreground text-xs">Move-in</div>
                  <div className="font-medium">{profile.move_in_date}</div>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  sendLike();
                }}
                disabled={liked || working}
              >
                <MessageCircle className="size-4" />
                {liked ? "Sent" : "Send message"}
              </Button>
              <Button variant="outline" onClick={report}>
                <Flag className="size-4 mr-2" /> Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
