import type { Metadata } from "next";
import { extractIdFromParam } from "@/lib/slug";
import { formatPrice } from "@/lib/currency";

/**
 * Link previews for shared property URLs.
 *
 * The page itself is a client component, so without this every shared listing
 * unfurled with the site-wide title and logo. WhatsApp, iMessage and the rest
 * only read server-rendered tags, so the listing is fetched here as well.
 * Approved listings are readable with the anon key, which is all a crawler has.
 */

type PreviewRow = {
  title: string | null;
  description: string | null;
  images: unknown;
  price: number | null;
  currency: string | null;
  location_city: string | null;
  location_country: string | null;
};

async function fetchPreview(id: string): Promise<PreviewRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const query = new URLSearchParams({
    id: `eq.${id}`,
    select: "title,description,images,price,currency,location_city,location_country",
  });
  try {
    const res = await fetch(`${url}/rest/v1/properties?${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as PreviewRow[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const id = extractIdFromParam((await params).id);
  const property = id ? await fetchPreview(id) : null;
  if (!property) return {};

  const title = property.title?.trim() || "A home on SafeHome";
  const where = [property.location_city, property.location_country]
    .filter(Boolean)
    .join(", ");
  const price =
    property.price != null
      ? `${formatPrice(Number(property.price), property.currency || "GBP")}/month`
      : null;
  const description =
    [price, where].filter(Boolean).join(" · ") ||
    property.description?.slice(0, 160) ||
    "View this listing on SafeHome.";

  const images = (Array.isArray(property.images) ? property.images : [])
    .filter((src): src is string => typeof src === "string" && src.startsWith("http"))
    .slice(0, 1);

  return {
    title: `${title} | SafeHome`,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "SafeHome",
      ...(images.length ? { images } : {}),
    },
    twitter: {
      card: images.length ? "summary_large_image" : "summary",
      title,
      description,
      ...(images.length ? { images } : {}),
    },
  };
}

export default function PropertyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
