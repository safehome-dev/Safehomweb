import type { Subscription } from "@/lib/types/database";

export function isSubscriptionActive(sub: Subscription | null): boolean {
  if (!sub) return false;
  if (sub.status !== "active") return false;
  if (sub.expires_at && new Date(sub.expires_at).getTime() <= Date.now()) {
    return false;
  }
  return true;
}
