"use client";

import { useSyncExternalStore } from "react";

import { detectPlatform, type Platform } from "@/lib/app-links";

// The user agent never changes for the life of the page, so there is nothing
// to subscribe to; the unsubscribe is a no-op.
const subscribe = () => () => {};

const serverSnapshot = (): Platform => "desktop";

/**
 * The visitor's platform, read the way React wants browser-only values read.
 *
 * useSyncExternalStore rather than an effect that sets state: these pages are
 * statically rendered, so the server has no user agent to go on, and this is
 * the hook that lets the server render one value ("desktop", which only ever
 * means "do not offer to open an app") and the browser correct it during
 * hydration without a second render pass or a mismatch warning.
 */
export function usePlatform(): Platform {
  return useSyncExternalStore(subscribe, detectPlatform, serverSnapshot);
}
