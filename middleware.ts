import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // `.well-known` is excluded on purpose. Those files are fetched by Apple's
    // CDN and by Android at install time to verify app links, and running a
    // Supabase session refresh for a machine-readable JSON file is both
    // pointless and a way for a future middleware change to quietly break
    // link verification.
    "/((?!_next/static|_next/image|favicon.ico|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
