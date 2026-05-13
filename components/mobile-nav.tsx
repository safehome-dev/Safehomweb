"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Heart, MessageCircle, ClipboardList, User as UserIcon } from "lucide-react";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur">
      <div className="grid grid-cols-5 h-16">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 text-xs ${
                active ? "text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
