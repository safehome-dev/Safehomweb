"use client";

import { useEffect, useState } from "react";

const APP_STORE = "https://apps.apple.com/app/id0000000000";
const PLAY_STORE =
  "https://play.google.com/store/apps/details?id=com.safehomes.safehome";

type Platform = "ios" | "android" | "desktop";

/**
 * The buttons on the live-link landing page.
 *
 * Platform detection happens after mount rather than on the server, because
 * this page is static and a cached copy must not carry one visitor's platform
 * to the next. Until it resolves, both buttons are still usable — the store
 * link just has not been chosen yet.
 *
 * Nothing redirects automatically. A page that navigates away by itself breaks
 * the back button and fires for crawlers and link previews too; which store to
 * visit is a decision the visitor makes.
 */
export default function OpenInApp({ streamId }: { streamId: string }) {
  const [platform, setPlatform] = useState<Platform | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    // iPadOS reports a Mac user agent, so touch support is what separates a
    // tablet from a desktop.
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) || (/Mac/.test(ua) && "ontouchend" in document);

    setPlatform(isIOS ? "ios" : /Android/.test(ua) ? "android" : "desktop");
  }, []);

  // The custom scheme is the second chance: if the Universal Link did not fire
  // — an in-app browser, say — this still reaches an installed app.
  const appUrl = `safehome://live/${encodeURIComponent(streamId)}`;

  const storeUrl =
    platform === "ios" ? APP_STORE : platform === "android" ? PLAY_STORE : "/";

  return (
    <div className="mt-6 grid gap-2.5">
      {platform !== "desktop" && (
        <a
          href={appUrl}
          className="block rounded-xl bg-[#1E3A8A] px-4 py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Open in SafeHome
        </a>
      )}

      <a
        href={storeUrl}
        className="block rounded-xl bg-slate-100 px-4 py-3.5 text-[15px] font-semibold text-[#1E3A8A] transition-colors hover:bg-slate-200"
      >
        {platform === "desktop" ? "Learn about SafeHome" : "Get the app"}
      </a>
    </div>
  );
}
