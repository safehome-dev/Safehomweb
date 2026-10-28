import type { Metadata } from "next";

/**
 * Shared pieces for server-rendered metadata: link previews (WhatsApp,
 * iMessage, Facebook, X) and search engines both read these tags.
 */

export const SITE_URL = "https://safehomweb.vercel.app";
export const SITE_NAME = "SafeHome";

/** The size every preview image is cut to: the 1.91:1 card most apps expect. */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/**
 * Reads rows with the anon key, which is all a crawler has. Only rows that
 * RLS already shows to signed-out visitors come back.
 */
export async function fetchPublicRows<T>(
  table: string,
  params: Record<string, string>,
  revalidate = 300
): Promise<T[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  try {
    const res = await fetch(`${url}/rest/v1/${table}?${new URLSearchParams(params)}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate },
    });
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

/** The first usable http(s) image in a jsonb array column, if any. */
export function firstImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  const hit = images.find((src) => typeof src === "string" && src.startsWith("http"));
  return (hit as string | undefined) ?? null;
}

/**
 * Points a Storage image at the site's /og route, which crops it to the card
 * size and re-encodes it as a small JPEG.
 *
 * Phone photos are often several MB and WhatsApp silently drops preview images
 * past a few hundred KB, so large uploads used to unfurl with no picture.
 * Images hosted anywhere else are passed through untouched.
 */
export function previewImage(src: string): string {
  if (!src.includes("/storage/v1/object/public/")) return src;
  return `/og?${new URLSearchParams({ src })}`;
}

export function truncate(text: string | null | undefined, max = 160): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

/** Builds the full metadata object for one shareable page. */
export function pageMetadata(opts: {
  /** The search-result title; the root layout appends "| SafeHome". */
  title: string;
  /** The bold line in a chat preview. Shorter than `title`. */
  shareTitle: string;
  description: string;
  path: string;
  image: string | null;
  imageAlt: string;
  index?: boolean;
}): Metadata {
  const images = opts.image
    ? [
        {
          url: previewImage(opts.image),
          width: OG_WIDTH,
          height: OG_HEIGHT,
          alt: opts.imageAlt,
        },
      ]
    : undefined;

  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path },
    robots: opts.index === false ? { index: false, follow: true } : undefined,
    openGraph: {
      title: opts.shareTitle,
      description: opts.description,
      url: opts.path,
      siteName: SITE_NAME,
      locale: "en_GB",
      type: "website",
      // Without its own image a page would show nothing; fall back to the brand.
      images: images ?? [{ url: "/logo.png", alt: SITE_NAME }],
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: opts.shareTitle,
      description: opts.description,
      images: images ?? ["/logo.png"],
    },
  };
}

/** Renders a JSON-LD block. `<` is escaped so user text can't close the tag. */
export function jsonLd(data: Record<string, unknown>): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
