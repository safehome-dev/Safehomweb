"use client";

import Link from "next/link";
import { Bell, LogOut, User as UserIcon, Heart, MessageCircle, ClipboardList } from "lucide-react";

import { useAuth } from "@/lib/providers/auth-provider";
import { useCurrency } from "@/lib/providers/currency-provider";
import { CURRENCY_FLAGS } from "@/lib/currency";
import { avatarFallback } from "@/lib/fallback-image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function SiteHeader() {
  const { user, profile, signOut } = useAuth();
  const { currencies, display, setDisplay } = useCurrency();
  const supabase = getSupabaseBrowserClient();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (mounted) setUnread(count ?? 0);
    };
    load();
    const channel = supabase
      .channel("notifications-header")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  const firstName = (profile?.name ?? user?.email ?? "").split(" ")[0] || "";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4 h-16 flex items-center gap-4">
        <Link href="/" className="text-xl font-bold text-primary shrink-0">
          SafeHome
        </Link>

        {user && (
          <div className="hidden md:flex flex-col text-sm leading-tight">
            <span className="font-medium">Hi, {firstName || "there"}!</span>
            <span className="text-muted-foreground text-xs">
              {profile?.city ?? "Set your location"}
            </span>
          </div>
        )}

        <div className="flex-1" />

        <nav className="hidden md:flex items-center gap-1">
          <Link href="/wishlist">
            <Button variant="ghost" size="sm" className="gap-2">
              <Heart className="size-4" /> Wishlist
            </Button>
          </Link>
          <Link href="/messages">
            <Button variant="ghost" size="sm" className="gap-2">
              <MessageCircle className="size-4" /> Messages
            </Button>
          </Link>
          <Link href="/bookings">
            <Button variant="ghost" size="sm" className="gap-2">
              <ClipboardList className="size-4" /> Bookings
            </Button>
          </Link>
        </nav>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1">
              <span>{CURRENCY_FLAGS[display] ?? "🌐"}</span>
              <span className="font-medium">{display}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-1">
            <div className="max-h-72 overflow-auto">
              {currencies.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">No currencies</div>
              )}
              {currencies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setDisplay(c.currency_code)}
                  className={`flex w-full items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent ${
                    display === c.currency_code ? "bg-accent" : ""
                  }`}
                >
                  <span>{CURRENCY_FLAGS[c.currency_code] ?? "🌐"}</span>
                  <span className="font-medium">{c.currency_code}</span>
                  <span className="text-muted-foreground text-xs ml-auto">
                    {c.currency_name}
                  </span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {user ? (
          <>
            <Link href="/messages" className="relative">
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="size-5" />
              </Button>
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-white text-xs font-bold flex items-center justify-center">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring">
                  <Avatar className="size-9">
                    <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.name ?? "user"} />
                    <AvatarFallback>
                      <img src={avatarFallback(profile?.name ?? user.email)} alt="" />
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col">
                    <span className="font-medium">{profile?.name ?? "Account"}</span>
                    <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile"><UserIcon className="size-4 mr-2" /> Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/wishlist"><Heart className="size-4 mr-2" /> Wishlist</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/messages"><MessageCircle className="size-4 mr-2" /> Messages</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/bookings"><ClipboardList className="size-4 mr-2" /> Bookings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="size-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Sign up</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
