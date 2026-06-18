const hits = new Map<string, number[]>();

export function checkRateLimit(key: string, maxHits: number, windowMs: number): boolean {
  const now = Date.now();
  const prev = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (prev.length >= maxHits) return false;
  hits.set(key, [...prev, now]);
  return true;
}
