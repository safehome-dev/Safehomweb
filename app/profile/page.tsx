"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Heart,
  MessageCircle,
  ClipboardList,
  Users,
  UserPlus,
  Mail,
  Building2,
  Wrench,
  CreditCard,
  Receipt,
  LogOut,
  ChevronRight,
} from "lucide-react";

import { SiteShell } from "@/components/site-shell";
import { useAuth } from "@/lib/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { avatarFallback } from "@/lib/fallback-image";

const rows: Array<{ href: string; label: string; icon: React.ElementType }> = [
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/friend-requests", label: "Friend requests", icon: Mail },
  { href: "/find-friends", label: "Find friends", icon: UserPlus },
  { href: "/listings/new", label: "Create listing", icon: Building2 },
  { href: "/services/new", label: "Become a service provider", icon: Wrench },
  { href: "/subscription", label: "Subscription", icon: CreditCard },
  { href: "/transaction-history", label: "Transaction history", icon: Receipt },
];

export default function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        <Card className="p-5 flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback>
              <img src={avatarFallback(profile?.name ?? user.email)} alt="" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-lg line-clamp-1">
              {profile?.name ?? "Add your name"}
            </div>
            <div className="text-sm text-muted-foreground line-clamp-1">{user.email}</div>
            {profile?.city && (
              <div className="text-xs text-muted-foreground mt-0.5">📍 {profile.city}</div>
            )}
            {profile?.bio && <p className="text-sm mt-2 line-clamp-2">{profile.bio}</p>}
          </div>
          <Link href="/profile/edit">
            <Button variant="outline" size="sm">Edit</Button>
          </Link>
        </Card>

        <Card className="p-0 overflow-hidden">
          <ul className="divide-y">
            {rows.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 p-4 hover:bg-accent transition"
                >
                  <Icon className="size-5 text-primary" />
                  <span className="flex-1 text-sm font-medium">{label}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Button variant="outline" className="w-full gap-2" onClick={() => signOut()}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </SiteShell>
  );
}
