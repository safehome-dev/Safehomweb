"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageCircle, MapPin } from "lucide-react";

import { SiteShell } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { avatarFallback } from "@/lib/fallback-image";
import type { Profile } from "@/lib/types/database";

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      setProfile(data as Profile | null);
      setLoading(false);
    })();
  }, [userId, supabase]);

  if (loading) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-8 max-w-xl">
          <Skeleton className="h-40" />
        </div>
      </SiteShell>
    );
  }

  if (!profile) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          User not found.
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 max-w-xl space-y-4">
        <Card className="p-6 text-center space-y-3">
          <Avatar className="size-24 mx-auto">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback>
              <img src={avatarFallback(profile.name ?? "user")} alt="" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold">{profile.name ?? "User"}</h1>
            {profile.city && (
              <div className="text-sm text-muted-foreground inline-flex items-center gap-1">
                <MapPin className="size-3.5" /> {profile.city}
              </div>
            )}
          </div>
          {profile.bio && <p className="text-sm">{profile.bio}</p>}
          {user && user.id !== profile.id && (
            <Link href={`/messages/${profile.id}`}>
              <Button className="gap-2">
                <MessageCircle className="size-4" /> Send message
              </Button>
            </Link>
          )}
        </Card>
      </div>
    </SiteShell>
  );
}
