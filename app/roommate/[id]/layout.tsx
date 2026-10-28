import type { Metadata } from "next";
import { cache } from "react";
import { extractIdFromParam, roommateHref } from "@/lib/slug";
import { formatPrice } from "@/lib/currency";
import { fetchPublicRows, firstImage, pageMetadata, truncate } from "@/lib/seo";

/**
 * Link previews for roommate profiles.
 *
 * These are private people rather than listings, so the page unfurls nicely
 * when someone shares it but is kept out of search results (noindex, and left
 * out of the sitemap).
 */

type RoommateRow = {
  id: string;
  user_id: string;
  profile_type: string | null;
  bio: string | null;
  occupation: string | null;
  city: string | null;
  country: string | null;
  budget_min: number | null;
  budget_max: number | null;
  rent_amount: number | null;
  currency: string | null;
  images: unknown;
};

const getRoommate = cache(async (param: string): Promise<RoommateRow | null> => {
  const id = extractIdFromParam(param);
  if (!id) return null;
  const rows = await fetchPublicRows<RoommateRow>("roommate_profiles", {
    id: `eq.${id}`,
    select:
      "id,user_id,profile_type,bio,occupation,city,country,budget_min,budget_max,rent_amount,currency,images",
  });
  return rows[0] ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const roommate = await getRoommate((await params).id);
  if (!roommate) return { title: "Profile not found", robots: { index: false } };

  const [person] = await fetchPublicRows<{ name: string | null; avatar_url: string | null }>(
    "profiles",
    { id: `eq.${roommate.user_id}`, select: "name,avatar_url" }
  );
  // First name only: enough to recognise who was shared, without putting a
  // full name into every chat preview.
  const name = person?.name?.trim().split(/\s+/)[0] || "Someone";
  const city = roommate.city?.trim();
  const currency = roommate.currency || "GBP";
  const offering = roommate.profile_type === "offering";

  const headline = offering
    ? `Room available${city ? ` in ${city}` : ""}`
    : `${name} is looking for a room${city ? ` in ${city}` : ""}`;
  const money = offering
    ? roommate.rent_amount != null
      ? `${formatPrice(Number(roommate.rent_amount), currency)}/month`
      : null
    : roommate.budget_max != null
      ? `Budget up to ${formatPrice(Number(roommate.budget_max), currency)}/month`
      : null;
  const lead = [money, roommate.occupation?.trim()].filter(Boolean).join(" · ");

  return pageMetadata({
    title: headline,
    shareTitle: headline,
    description:
      truncate([lead, roommate.bio].filter(Boolean).join(". "), 200) ||
      "Find a roommate on SafeHome.",
    path: roommateHref({ id: roommate.id, name: person?.name }),
    image: firstImage(roommate.images) ?? person?.avatar_url ?? null,
    imageAlt: headline,
    index: false,
  });
}

export default function RoommateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
