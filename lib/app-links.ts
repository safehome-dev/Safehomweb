/**
 * Everything about getting a visitor from the website into the app.
 *
 * The store links are the real listings, not search URLs, so a visitor who
 * does not have the app lands on the install page rather than a results list.
 */
export const APP_STORE_URL =
  "https://apps.apple.com/us/app/safehome-worldwide/id6759487924";
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.safehomes.safehome";

export type Platform = "ios" | "android" | "desktop";

/**
 * Deep-link targets, named after the app's own routes.
 *
 * These are route names in the mobile app's router, not website paths — the
 * two differ (the site has `/services/<slug>`, the app has `/service-provider/
 * <id>`), so the mapping lives here rather than being guessed at each call
 * site. The app takes raw UUIDs, while website URLs carry a slug and an
 * encoded id, which is why these take the id rather than the path.
 */
export const appLink = {
  property: (id: string) => `safehome://property/${encodeURIComponent(id)}`,
  service: (id: string) => `safehome://service-provider/${encodeURIComponent(id)}`,
  live: (id: string) => `safehome://live/${encodeURIComponent(id)}`,
  // A roommate listing belongs to a person, and the app shows it on their
  // profile rather than on a page of its own.
  roommate: (userId: string) => `safehome://user-profile/${encodeURIComponent(userId)}`,
  stories: (userId: string) => `safehome://story/${encodeURIComponent(userId)}`,
  home: () => "safehome://",
} as const;

/**
 * Which platform the visitor is on.
 *
 * Must run after mount, never on the server: these pages are statically cached
 * and a server-rendered guess would hand one visitor's platform to the next.
 */
export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  // iPadOS reports a Mac user agent, so touch support is what separates a
  // tablet from a desktop.
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) || (/Mac/.test(ua) && "ontouchend" in document);
  if (isIOS) return "ios";
  return /Android/.test(ua) ? "android" : "desktop";
}

export function storeUrlFor(platform: Platform): string {
  return platform === "ios" ? APP_STORE_URL : PLAY_STORE_URL;
}

/**
 * Opens the app if it is installed, and falls back to the store if it is not.
 *
 * There is no API that answers "is the app installed", so this infers it: the
 * custom scheme is assigned to `location.href`, and if the app takes over, the
 * browser is backgrounded and the page stops being visible. Still visible when
 * the timer fires means nothing handled the scheme, so the store is the right
 * destination.
 *
 * The visibility checks are what keep this from firing wrongly. Without them a
 * visitor who *does* have the app would come back from it to find the store
 * open behind, which is worse than not offering the button at all.
 */
export function openAppOrStore(deepLink: string, platform: Platform): void {
  const store = storeUrlFor(platform);

  if (platform === "desktop") {
    window.location.href = store;
    return;
  }

  let settled = false;
  const stop = () => {
    settled = true;
  };

  // Any of these means the app took over and this tab went to the background.
  document.addEventListener("visibilitychange", stop, { once: true });
  window.addEventListener("pagehide", stop, { once: true });
  window.addEventListener("blur", stop, { once: true });

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", stop);
    window.removeEventListener("pagehide", stop);
    window.removeEventListener("blur", stop);
    if (settled || document.hidden) return;
    window.location.href = store;
  }, 1500);

  window.location.href = deepLink;
}
