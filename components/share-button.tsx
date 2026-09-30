"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface Props {
  /** Site-relative path, e.g. from propertyHref/serviceHref/roommateHref. */
  href: string;
  title: string;
  text?: string;
  className?: string;
  /** Cards sit inside a <Link>, so the click must not also navigate. */
  stopPropagation?: boolean;
}

/**
 * Shares the canonical website URL for a record.
 *
 * Every share across the site and the app resolves to the same address, so a
 * link sent from a phone and one sent from a browser are the same page: link
 * previews, analytics and browser history all treat them as one thing rather
 * than two. The app builds these URLs with the same slug-plus-code scheme in
 * its own lib/shareLinks.ts.
 *
 * navigator.share only exists on mobile and under HTTPS; everywhere else this
 * copies, which is the behaviour people expect from a share button on desktop.
 */
export function ShareButton({
  href,
  title,
  text,
  className,
  stopPropagation = true,
}: Props) {
  async function share(e: React.MouseEvent) {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }

    const url = `${window.location.origin}${href}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // Dismissing the sheet lands here too, so fall through quietly rather
        // than telling someone an action they cancelled has failed.
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={share}
      aria-label={`Share ${title}`}
      className={className}
    >
      <Share2 className="size-4" />
    </Button>
  );
}
