/**
 * Simple in-memory sliding window rate limiter (per key).
 * Fine for a single Node/PM2 process.
 */
export function createRateLimiter({ windowMs, max }) {
  /** @type {Map<string, number[]>} */
  const hits = new Map();

  function prune(now) {
    if (hits.size < 500) return;
    for (const [key, times] of hits) {
      const recent = times.filter((t) => now - t < windowMs);
      if (recent.length === 0) hits.delete(key);
      else hits.set(key, recent);
    }
  }

  return function rateLimit(key) {
    const now = Date.now();
    prune(now);
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      const retryAfterMs = windowMs - (now - recent[0]);
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }
    recent.push(now);
    hits.set(key, recent);
    return { allowed: true, retryAfterSec: 0 };
  };
}

export function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) {
    return xf.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}
