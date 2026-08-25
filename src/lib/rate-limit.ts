interface Attempt {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, Attempt>();

/**
 * Small in-process throttle for credential endpoints. Good enough for a single
 * instance; swap for a shared store when running multiple replicas.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;

  current.count += 1;
  return true;
}

export function clearRateLimit(key: string): void {
  attempts.delete(key);
}
