"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  CheckCheck,
  CreditCard,
  MessageCircle,
  Phone,
  Shield,
  Star,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Notification } from "@/lib/types/database";

const ICONS: Record<string, React.ElementType> = {
  message: MessageCircle,
  connection: Users,
  review: Star,
  subscription: CreditCard,
  admin: Shield,
  property_update: Bell,
};

function iconFor(type: string) {
  return ICONS[type] ?? Bell;
}

export function NotificationsPopover() {
  const { user, profile } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  // Phone alert is treated as a synthetic notification so it lives in the same
  // surface as DB-backed notifications. It only appears when the profile lacks
  // a phone number and disappears the moment one is saved.
  const showPhoneAlert = !!user && profile && !profile.phone;

  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnread(0);
      return;
    }
    let mounted = true;
    const refresh = async () => {
      const [{ data }, { count }] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false),
      ]);
      if (!mounted) return;
      setItems((data ?? []) as Notification[]);
      setUnread(count ?? 0);
    };
    refresh();
    const channel = supabase
      .channel("notifications-popover")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        refresh
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  async function markAllRead() {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  }

  async function markRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnread((u) => Math.max(0, u - 1));
  }

  const totalBadge = unread + (showPhoneAlert ? 1 : 0);

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="size-5" />
          {totalBadge > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-white text-xs font-bold flex items-center justify-center">
              {totalBadge > 99 ? "99+" : totalBadge}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="size-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto divide-y">
          {showPhoneAlert && (
            <Link
              href="/profile/edit"
              onClick={() => setOpen(false)}
              className="flex items-start gap-3 px-3 py-3 hover:bg-accent transition bg-amber-50/60"
            >
              <div className="size-9 rounded-full bg-amber-100 text-amber-700 grid place-items-center shrink-0">
                <Phone className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-amber-900">
                  Add your phone number
                </div>
                <div className="text-xs text-amber-800/90 line-clamp-2">
                  Guests, roommates and service customers can&apos;t reach you
                  without one. Tap to add it now.
                </div>
              </div>
            </Link>
          )}

          {items.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              {showPhoneAlert ? "" : "You're all caught up."}
              {!showPhoneAlert && (
                <Bell className="size-10 mx-auto mb-2 text-muted-foreground/40" />
              )}
            </div>
          ) : (
            items.map((n) => {
              const Icon = iconFor(n.type);
              return (
                <Link
                  key={n.id}
                  href={(n.action_url as string) || "/profile"}
                  onClick={() => {
                    if (!n.is_read) void markRead(n.id);
                    setOpen(false);
                  }}
                  className={`flex items-start gap-3 px-3 py-3 hover:bg-accent transition ${
                    !n.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="size-9 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium line-clamp-1">
                      {n.title}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {n.message}
                    </div>
                    {n.created_at && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                        })}
                      </div>
                    )}
                  </div>
                  {!n.is_read && (
                    <span className="size-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </Link>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
