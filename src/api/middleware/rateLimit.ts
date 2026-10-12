import { Elysia } from "elysia";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type Duration =
  | `${number} ms`
  | `${number} s`
  | `${number} m`
  | `${number} h`
  | `${number} d`;

export interface RateLimitOptions {
  /**
   * Maximum allowed requests within the time window.
   * Default reads RATE_LIMIT_MAX from env or 60.
   */
  max?: number;
  /**
   * Sliding window duration, e.g. "60 s", "1 m".
   * Default reads RATE_LIMIT_WINDOW from env or "60 s".
   */
  window?: Duration;
  /**
   * Prefix for Redis keys to prevent collisions.
   * Default is "calendarbali:ratelimit".
   */
  prefix?: string;
  /**
   * Optional custom function to determine client identity.
   * Defaults to extracting client IP from headers.
   */
  keyGenerator?: (request: Request) => string;
  /**
   * Optional condition to bypass rate limiting (e.g. for static assets or health checks).
   */
  skip?: (request: Request) => boolean;
  /**
   * Custom message returned when limit is exceeded.
   * Default is "Too many requests. Please try again later."
   */
  message?: string;
}

// Fallback in-memory bucket store for offline/local development or temporary redis outage
interface MemoryBucket {
  count: number;
  resetAt: number;
}
const memoryStore = new Map<string, MemoryBucket>();

function defaultClientKey(request: Request): string {
  const headerValue =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for");

  if (headerValue) {
    return headerValue.split(",")[0]?.trim() || headerValue;
  }

  return "unknown";
}

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token && !url.includes("your-upstash-instance")) {
    redisClient = new Redis({ url, token });
    return redisClient;
  }

  return null;
}

export function rateLimit(options: RateLimitOptions = {}) {
  const max =
    options.max ??
    (process.env.RATE_LIMIT_MAX ? Number(process.env.RATE_LIMIT_MAX) : 60);

  const windowDuration: Duration =
    options.window ??
    ((process.env.RATE_LIMIT_WINDOW as Duration) || "60 s");

  const prefix = options.prefix ?? "calendarbali:ratelimit";
  const getKey = options.keyGenerator ?? defaultClientKey;
  const shouldSkip = options.skip;
  const errorMessage =
    options.message ?? "Too many requests. Please try again later.";

  const redis = getRedisClient();

  const upstashLimiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(max, windowDuration),
        prefix,
        analytics: true,
      })
    : null;

  return new Elysia({ name: "upstash-rate-limit" }).onRequest(
    async ({ request, set }) => {
      if (shouldSkip && shouldSkip(request)) {
        return;
      }

      const key = getKey(request);

      // 1. Upstash Redis Rate Limiting
      if (upstashLimiter) {
        try {
          const result = await upstashLimiter.limit(key);

          set.headers["x-ratelimit-limit"] = String(result.limit);
          set.headers["x-ratelimit-remaining"] = String(result.remaining);
          set.headers["x-ratelimit-reset"] = String(result.reset);

          if (!result.success) {
            const retryAfter = Math.max(
              1,
              Math.ceil((result.reset - Date.now()) / 1000),
            );

            return new Response(
              JSON.stringify({
                error: "Too Many Requests",
                message: errorMessage,
                limit: result.limit,
                remaining: result.remaining,
                resetAt: result.reset,
                retryAfter,
              }),
              {
                status: 429,
                headers: {
                  "content-type": "application/json; charset=utf-8",
                  "retry-after": String(retryAfter),
                  "x-ratelimit-limit": String(result.limit),
                  "x-ratelimit-remaining": String(result.remaining),
                  "x-ratelimit-reset": String(result.reset),
                },
              },
            );
          }

          return;
        } catch (err) {
          console.warn(
            "[RateLimit] Upstash Redis error, falling back to memory:",
            err,
          );
          // Fall through to memory fallback
        }
      }

      // 2. In-Memory fallback (if Redis is not configured or temporary failure)
      const now = Date.now();
      const windowMs = 60_000;
      const bucket = memoryStore.get(key);

      if (!bucket || bucket.resetAt <= now) {
        memoryStore.set(key, { count: 1, resetAt: now + windowMs });
      } else {
        bucket.count += 1;
        memoryStore.set(key, bucket);
      }

      const current = memoryStore.get(key)!;
      const remaining = Math.max(0, max - current.count);

      set.headers["x-ratelimit-limit"] = String(max);
      set.headers["x-ratelimit-remaining"] = String(remaining);
      set.headers["x-ratelimit-reset"] = String(current.resetAt);

      if (current.count > max) {
        const retryAfter = Math.max(
          1,
          Math.ceil((current.resetAt - now) / 1000),
        );

        return new Response(
          JSON.stringify({
            error: "Too Many Requests",
            message: errorMessage,
            limit: max,
            remaining: 0,
            resetAt: current.resetAt,
            retryAfter,
          }),
          {
            status: 429,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "retry-after": String(retryAfter),
              "x-ratelimit-limit": String(max),
              "x-ratelimit-remaining": "0",
              "x-ratelimit-reset": String(current.resetAt),
            },
          },
        );
      }

      // Cleanup memory store occasionally
      if (memoryStore.size > 5_000) {
        for (const [k, v] of memoryStore.entries()) {
          if (v.resetAt <= now) memoryStore.delete(k);
        }
      }
    },
  );
}

export default rateLimit;
