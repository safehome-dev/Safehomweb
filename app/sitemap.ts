import type { MetadataRoute } from "next";
import { propertyHref, serviceHref } from "@/lib/slug";
import { fetchPublicRows, SITE_URL } from "@/lib/seo";

/**
 * Tells search engines which listing pages exist. Roommate profiles are left
 * out on purpose: they are people, not listings, and are marked noindex.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [properties, services] = await Promise.all([
    fetchPublicRows<{ id: string; title: string; updated_at: string | null }>(
      "properties",
      { approval_status: "eq.approved", select: "id,title,updated_at", order: "updated_at.desc" },
      3600
    ),
    fetchPublicRows<{ id: string; business_name: string; updated_at: string | null }>(
      "service_providers",
      { is_active: "eq.true", select: "id,business_name,updated_at", order: "updated_at.desc" },
      3600
    ),
  ]);

  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/services`, changeFrequency: "daily", priority: 0.8 },
    ...properties.map((p) => ({
      url: `${SITE_URL}${propertyHref(p)}`,
      lastModified: p.updated_at ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...services.map((s) => ({
      url: `${SITE_URL}${serviceHref(s)}`,
      lastModified: s.updated_at ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
