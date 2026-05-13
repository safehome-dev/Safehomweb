// Mirrors the mobile fallback: if a listing has no images, build a search URL
// over Unsplash so cards never render blank.
export function propertyFallbackImage(title?: string | null, city?: string | null) {
  const q = encodeURIComponent(`${title ?? ""} ${city ?? ""} apartment`.trim() || "modern apartment");
  return `https://source.unsplash.com/featured/?${q}`;
}

export function avatarFallback(name?: string | null) {
  const seed = encodeURIComponent(name ?? "user");
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`;
}
