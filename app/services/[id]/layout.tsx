import type { Metadata } from "next";
import { cache } from "react";
import { extractIdFromParam, serviceHref } from "@/lib/slug";
import { formatPrice } from "@/lib/currency";
import { fetchPublicRows, firstImage, jsonLd, pageMetadata, previewImage, SITE_URL, truncate } from "@/lib/seo";

/** Link previews and search metadata for service provider pages. */

type ServiceRow = {
  id: string;
  user_id: string;
  business_name: string | null;
  bio: string | null;
  service_categories: unknown;
  city: string | null;
  country: string | null;
  hourly_rate: number | null;
  currency: string | null;
  pricing_type: string | null;
  portfolio_images: unknown;
  average_rating: number | null;
  total_reviews: number | null;
};

const getService = cache(async (param: string): Promise<ServiceRow | null> => {
  const id = extractIdFromParam(param);
  if (!id) return null;
  const rows = await fetchPublicRows<ServiceRow>("service_providers", {
    id: `eq.${id}`,
    select:
      "id,user_id,business_name,bio,service_categories,city,country,hourly_rate,currency,pricing_type,portfolio_images,average_rating,total_reviews",
  });
  return rows[0] ?? null;
});

/** No portfolio yet: the provider's own photo is better than the logo. */
const getAvatar = cache(async (userId: string): Promise<string | null> => {
  const rows = await fetchPublicRows<{ avatar_url: string | null }>("profiles", {
    id: `eq.${userId}`,
    select: "avatar_url",
  });
  return rows[0]?.avatar_url ?? null;
});

function categories(s: ServiceRow): string[] {
  return Array.isArray(s.service_categories)
    ? s.service_categories
        .filter((c): c is string => typeof c === "string")
        .map((c) => c.charAt(0).toUpperCase() + c.slice(1).replace(/_/g, " "))
    : [];
}

function where(s: ServiceRow): string {
  return [s.city?.trim(), s.country?.trim()].filter(Boolean).join(", ");
}

function rate(s: ServiceRow): string | null {
  if (s.hourly_rate == null) return null;
  const amount = formatPrice(Number(s.hourly_rate), s.currency || "GBP");
  return s.pricing_type === "fixed" ? `From ${amount}` : `${amount}/hour`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const service = await getService((await params).id);
  if (!service) return { title: "Service not found", robots: { index: false } };

  const name = service.business_name?.trim() || "Local service";
  const kinds = categories(service);
  const place = where(service);
  const rating =
    service.average_rating && service.total_reviews
      ? `★ ${Number(service.average_rating).toFixed(1)} (${service.total_reviews})`
      : null;
  const lead = [kinds.join(", "), place, rate(service), rating].filter(Boolean).join(" · ");
  const image =
    firstImage(service.portfolio_images) ?? (await getAvatar(service.user_id));

  return pageMetadata({
    title: [name, kinds[0] && service.city?.trim() ? `${kinds[0]} in ${service.city.trim()}` : kinds[0]]
      .filter(Boolean)
      .join(" – "),
    shareTitle: name,
    description:
      truncate([lead, service.bio].filter(Boolean).join(". "), 200) ||
      "Book trusted local services on SafeHome.",
    path: serviceHref({ id: service.id, business_name: name }),
    image,
    imageAlt: place ? `${name}, ${place}` : name,
  });
}

export default async function ServiceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const service = await getService((await params).id);
  const image = service
    ? firstImage(service.portfolio_images) ?? (await getAvatar(service.user_id))
    : null;

  return (
    <>
      {service && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: service.business_name,
            description: truncate(service.bio, 500),
            url: `${SITE_URL}${serviceHref({ id: service.id, business_name: service.business_name ?? "" })}`,
            ...(image ? { image: previewImage(image) } : {}),
            address: {
              "@type": "PostalAddress",
              addressLocality: service.city,
              addressCountry: service.country,
            },
            ...(service.average_rating && service.total_reviews
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: Number(service.average_rating),
                    reviewCount: service.total_reviews,
                  },
                }
              : {}),
          })}
        />
      )}
      {children}
    </>
  );
}
