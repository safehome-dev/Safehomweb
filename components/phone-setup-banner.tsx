"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, X } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/lib/providers/auth-provider";

// Pages where the banner would be redundant (e.g. you're already on profile/edit)
// or visually disruptive (e.g. login / signup).
const HIDDEN_PATHS = ["/profile/edit", "/login", "/signup", "/auth/callback"];

export function PhoneSetupBanner() {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);

  if (loading || !user) return null;
  if (profile?.phone) return null;
  if (dismissed) return null;
  if (pathname && HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  return (
    <div className="sticky top-16 z-30 border-b border-amber-300/60 bg-amber-50 text-amber-900">
      <div className="container mx-auto px-4 py-2 flex items-center gap-3">
        <Phone className="size-4 shrink-0" />
        <Link
          href="/profile/edit"
          className="text-sm font-medium flex-1 hover:underline line-clamp-1"
        >
          Add your phone number so guests, roommates and customers can reach
          you. Tap to set it now.
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="rounded-md p-1 hover:bg-amber-100 cursor-pointer"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
