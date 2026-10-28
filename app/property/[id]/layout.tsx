import type { Metadata } from "next";
import { cache } from "react";
import { extractIdFromParam, propertyHref } from "@/lib/slug";
import { formatPrice } from "@/lib/currency";
import { fetchPublicRows, firstImage, jsonLd, pageMetadata, previewImage, SITE_URL, truncate } from "@/lib/seo";

/**
 * Link previews and search metadata for property pages.
 *
 * The page itself is a client component (and asks visitors to sign in), so
 * everything a crawler sees comes from here.
 */

type PropertyRow = {
  id: string;
  title: string | null;
  description: string | null;
  images: unknown;
  price: number | null;
  currency: string | null;
  location_city: string | null;
  location_country: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type: string | null;
};

const getProperty = cache(async (param: string): Promise<PropertyRow | null> => {
  const id = extractIdFromParam(param);
  if (!id) return null;
  const rows = await fetchPublicRows<PropertyRow>("properties", {
    id: `eq.${id}`,
    select:
      "id,title,description,images,price,currency,location_city,location_country,bedrooms,bathrooms,property_type",
  });
  return rows[0] ?? null;
});

function where(p: PropertyRow): string {
  return [p.location_city?.trim(), p.location_country?.trim()].filter(Boolean).join(", ");
}

function monthly(p: PropertyRow): string | null {
  return p.price != null ? `${formatPrice(Number(p.price), p.currency || "GBP")}/month` : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const property = await getProperty((await params).id);
  if (!property) return { title: "Property not found", robots: { index: false } };

  const name = property.title?.trim() || "Room to rent";
  const place = where(property);
  const price = monthly(property);
  const facts = [
    property.bedrooms ? `${property.bedrooms} bed` : null,
    property.bathrooms ? `${property.bathrooms} bath` : null,
  ]
    .filter(Boolean)
    .join(", ");

  // The chat preview shows the description under the title, so the facts
  // people decide on come first and the listing's own words fill the rest.
  const lead = [price, place, facts].filter(Boolean).join(" · ");
  const description = truncate(
    [lead, property.description].filter(Boolean).join(". "),
    200
  );

  return pageMetadata({
    title: [name, price && place ? `${price} in ${property.location_city?.trim()}` : price]
      .filter(Boolean)
      .join(" – "),
    shareTitle: name,
    description: description || "View this home on SafeHome.",
    path: propertyHref({ id: property.id, title: name }),
    image: firstImage(property.images),
    imageAlt: place ? `${name} in ${place}` : name,
  });
}

export default async function PropertyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const property = await getProperty((await params).id);
  const image = property ? firstImage(property.images) : null;

  return (
    <>
      {property && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd({
            "@context": "https://schema.org",
            "@type": "Accommodation",
            name: property.title,
            description: truncate(property.description, 500),
            url: `${SITE_URL}${propertyHref({ id: property.id, title: property.title ?? "" })}`,
            ...(image ? { image: previewImage(image) } : {}),
            ...(property.bedrooms ? { numberOfBedrooms: property.bedrooms } : {}),
            ...(property.bathrooms ? { numberOfBathroomsTotal: property.bathrooms } : {}),
            address: {
              "@type": "PostalAddress",
              addressLocality: property.location_city,
              addressCountry: property.location_country,
            },
            ...(property.price != null
              ? {
                  offers: {
                    "@type": "Offer",
                    price: Number(property.price),
                    priceCurrency: property.currency || "GBP",
                    priceSpecification: {
                      "@type": "UnitPriceSpecification",
                      price: Number(property.price),
                      priceCurrency: property.currency || "GBP",
                      unitCode: "MON",
                    },
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
