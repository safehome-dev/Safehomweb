"use client";

import { Smartphone } from "lucide-react";

import { openAppOrStore, storeUrlFor } from "@/lib/app-links";
import { usePlatform } from "@/lib/use-platform";
import { Button } from "@/components/ui/button";

interface Props {
  /** The `safehome://` target, from `appLink` in lib/app-links. */
  deepLink: string;
  /** What the visitor is looking at, e.g. "this listing". */
  label?: string;
  className?: string;
  variant?: "full" | "inline";
}

/**
 * "Open in app" — opens the app when it is installed, the store when it is not.
 *
 * Nothing redirects on page load. A page that navigates away by itself breaks
 * the back button and fires for crawlers and link previews too, so which app
 * to open stays a decision the visitor makes by tapping.
 *
 * On desktop there is no app to open, so the button becomes a plain link to
 * the store, where the listing page can at least be sent to a phone.
 */
export function OpenInApp({
  deepLink,
  label = "this listing",
  className = "",
  variant = "full",
}: Props) {
  const platform = usePlatform();
  const isDesktop = platform === "desktop";

  if (variant === "inline") {
    return (
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={() => openAppOrStore(deepLink, platform)}
      >
        <Smartphone className="size-4" />
        Open in app
      </Button>
    );
  }

  return (
    <div className={`rounded-xl border bg-muted/40 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10">
          <Smartphone className="size-4.5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Better in the SafeHome app</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isDesktop
              ? `Message, call and book ${label} from your phone.`
              : `Open ${label} in the app to message, call and book.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              onClick={() => openAppOrStore(deepLink, platform)}
              className="grow sm:grow-0"
            >
              {isDesktop ? "Get the app" : "Open in app"}
            </Button>
            {!isDesktop && (
              <Button variant="ghost" asChild>
                <a href={storeUrlFor(platform)}>Don&apos;t have it yet?</a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
