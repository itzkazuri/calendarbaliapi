import { Elysia } from "elysia";

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

function getClientKey(request: Request): string {
  const headerValue =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for");

  if (headerValue) {
    return headerValue.split(",")[0]?.trim() || headerValue;
  }

  return "unknown";
}

export function rateLimit(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 60_000;
  const max = options.max ?? 60;
  const store = new Map<string, Bucket>();

  return new Elysia({ name: "rate-limit" }).onBeforeHandle(({ request, set }) => {
    const key = getClientKey(request);
    const now = Date.now();

    const bucket = store.get(key);
    if (!bucket || bucket.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      bucket.count += 1;
      store.set(key, bucket);
    }

    const current = store.get(key)!;
    const remaining = Math.max(0, max - current.count);

    set.headers["x-ratelimit-limit"] = String(max);
    set.headers["x-ratelimit-remaining"] = String(remaining);
    set.headers["x-ratelimit-reset"] = String(current.resetAt);

    if (current.count > max) {
      set.status = 429;
      return {
        error: "Rate limit exceeded",
        message:
          "Terlalu banyak permintaan. Coba lagi setelah beberapa saat.",
        limit: max,
        windowMs,
        resetAt: current.resetAt,
      };
    }

    // lazy cleanup to avoid memory growth
    if (store.size > 10_000) {
      for (const [k, v] of store.entries()) {
        if (v.resetAt <= now) store.delete(k);
      }
    }
  });
}
