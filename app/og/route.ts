import sharp from "sharp";
import { OG_HEIGHT, OG_WIDTH } from "@/lib/seo";

/**
 * Serves a listing photo as a small JPEG for link previews.
 *
 * Supabase's resize endpoint keeps the source format, so a PNG upload comes
 * back as an 800 KB PNG even at preview size, and WhatsApp drops anything that
 * heavy. Re-encoding here makes every preview a ~50-120 KB JPEG whatever was
 * uploaded.
 *
 * Only images from this project's Storage are accepted, so the route can't be
 * used to proxy arbitrary URLs.
 */

export const runtime = "nodejs";

const STORAGE_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`;

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("src") ?? "";
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !src.startsWith(STORAGE_PREFIX)) {
    return new Response("Not found", { status: 404 });
  }

  // Let Supabase do the crop first so we never pull a multi-MB original.
  const resized = new URL(src.replace("/object/public/", "/render/image/public/"));
  resized.searchParams.set("width", String(OG_WIDTH));
  resized.searchParams.set("height", String(OG_HEIGHT));
  resized.searchParams.set("resize", "cover");

  const upstream = await fetch(resized, { next: { revalidate: 86400 } });
  if (!upstream.ok) return new Response("Not found", { status: 404 });

  const jpeg = await sharp(Buffer.from(await upstream.arrayBuffer()))
    .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover" })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 75, mozjpeg: true })
    .toBuffer();

  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      // Photos for a given path never change (uploads get new names), so the
      // CDN can keep this for good.
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
