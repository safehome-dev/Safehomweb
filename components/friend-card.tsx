"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import type { Profile } from "@/lib/types/database";
import { avatarFallback } from "@/lib/fallback-image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

interface Props {
  friend: Pick<Profile, "id" | "name" | "avatar_url" | "bio">;
  since: string;
}

export function FriendCard({ friend, since }: Props) {
  return (
    <Link href={`/u/${friend.id}`}>
      <Card className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
        <Avatar className="size-12">
          <AvatarImage src={friend.avatar_url ?? undefined} />
          <AvatarFallback>
            <img src={avatarFallback(friend.name ?? "Friend")} alt="" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="font-medium line-clamp-1">{friend.name ?? "Friend"}</div>
          {friend.bio && (
            <div className="text-sm text-muted-foreground line-clamp-1">{friend.bio}</div>
          )}
          <div className="text-xs text-muted-foreground">
            Friends since {formatDistanceToNow(new Date(since), { addSuffix: true })}
          </div>
        </div>
      </Card>
    </Link>
  );
}
