// URLs use `slug-<22char-code>` where <22char-code> is the UUID re-encoded as
// base64url (16 raw bytes -> 22 chars, no padding). The DB column is still a
// UUID — we just stop putting it on the wire so URLs don't advertise the
// schema. `extractIdFromParam` also accepts a raw UUID in the param so any
// links indexed before this change still resolve.

const UUID_RE_GLOBAL =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const UUID_RE_FULL =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE_LEN = 22; // base64url of 16 raw bytes, no padding

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function uuidToCode(uuid: string): string {
  const hex = uuid.replace(/-/g, "").toLowerCase();
  if (hex.length !== 32) return uuid;
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 =
    typeof btoa === "function"
      ? btoa(bin)
      : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function codeToUuid(code: string): string | null {
  if (code.length !== CODE_LEN) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(code)) return null;
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const bin =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("binary");
    if (bin.length !== 16) return null;
    let hex = "";
    for (let i = 0; i < 16; i++) {
      hex += bin.charCodeAt(i).toString(16).padStart(2, "0");
    }
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return null;
  }
}

export function propertyHref(p: { id: string; title: string }): string {
  const slug = slugify(p.title);
  const code = uuidToCode(p.id);
  return slug ? `/property/${slug}-${code}` : `/property/${code}`;
}

export function serviceHref(p: { id: string; business_name: string }): string {
  const slug = slugify(p.business_name);
  const code = uuidToCode(p.id);
  return slug ? `/services/${slug}-${code}` : `/services/${code}`;
}

export function extractIdFromParam(
  param: string | undefined | null
): string | null {
  if (!param) return null;
  const decoded = (() => {
    try {
      return decodeURIComponent(param);
    } catch {
      return param;
    }
  })();

  // 1. Legacy: param contains a raw UUID anywhere (back-compat for old links).
  const m = decoded.match(UUID_RE_GLOBAL);
  if (m) return m[0].toLowerCase();

  // 2. New: the last CODE_LEN chars are the base64url-encoded UUID.
  if (decoded.length < CODE_LEN) return null;
  const code = decoded.slice(-CODE_LEN);
  const candidate = codeToUuid(code);
  if (candidate && UUID_RE_FULL.test(candidate)) return candidate;
  return null;
}
