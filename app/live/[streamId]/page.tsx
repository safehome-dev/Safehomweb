import type { Metadata } from "next";
import OpenInApp from "./OpenInApp";

/**
 * The page behind a shared SafeHome live link.
 *
 * On a phone with the app installed this is usually never seen: iOS Universal
 * Links and Android App Links hand the URL straight to the app. It exists for
 * everyone else — the wrong platform, a desktop browser, or nobody having
 * installed anything yet.
 */

export const metadata: Metadata = {
  title: "Watch live on SafeHome",
  description: "Join a live property tour on SafeHome.",
  openGraph: {
    title: "Watch live on SafeHome",
    description: "Join a live property tour on SafeHome.",
    type: "website",
  },
};

export default async function LiveStreamLanding({
  params,
}: {
  params: Promise<{ streamId: string }>;
}) {
  const { streamId } = await params;

  return (
    <div className="container mx-auto flex min-h-[80vh] max-w-md items-center px-4 py-8">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold tracking-wider text-red-600">
          <span className="h-1.5 w-1.5 rounded-full bg-red-600 motion-safe:animate-pulse" />
          LIVE NOW
        </span>

        <h1 className="mt-5 text-2xl font-bold text-slate-900">
          Someone is live on SafeHome
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Open the app to join the property tour.
        </p>

        <OpenInApp streamId={streamId} />

        <p className="mt-6 border-t border-slate-200 pt-5 text-xs text-slate-500">
          Live tours end when the host stops broadcasting, so this link only
          works while they are on air.
        </p>
      </div>
    </div>
  );
}
