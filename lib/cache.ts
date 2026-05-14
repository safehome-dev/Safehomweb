// Tiny in-memory cache for client-side Supabase reads. Survives in-app
// navigation (the module is kept alive by the bundler) but is lost on hard
// refresh. Use only for non-sensitive, read-mostly data; pair every write
// path with an explicit `invalidate()` call on the matching prefix.

type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs = 60_000
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;

  // Coalesce concurrent callers for the same key onto a single request.
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = (async () => {
    try {
      const value = await fn();
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
}

export function invalidate(prefix: string): void {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

export function clearCache(): void {
  store.clear();
  inflight.clear();
}
