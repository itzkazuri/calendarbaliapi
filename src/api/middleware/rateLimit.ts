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
  /**
   * How many times an IP is allowed to exceed the rate limit before getting banned.
   * Default is 3 violations.
   */
  banAfterViolations?: number;
  /**
   * Duration of the ban in milliseconds.
   * Default is 12 hours (43_200_000 ms).
   */
  banDurationMs?: number;
}

// ── Redis key helpers ──────────────────────────────────────────────────────────
const KEY_VIOLATION = (prefix: string, ip: string) =>
  `${prefix}:violations:${ip}`;
const KEY_BAN = (prefix: string, ip: string) => `${prefix}:ban:${ip}`;

// ── In-memory fallback stores ──────────────────────────────────────────────────
interface MemoryBucket {
  count: number;
  resetAt: number;
}

interface BanRecord {
  bannedAt: number;
  unbanAt: number;
  violations: number;
}

const memoryStore = new Map<string, MemoryBucket>();
const memoryViolations = new Map<string, number>();
const memoryBans = new Map<string, BanRecord>();

// ── Client IP helper ───────────────────────────────────────────────────────────
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

// ── Redis singleton ────────────────────────────────────────────────────────────
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

// ── Ban response helper ────────────────────────────────────────────────────────
function banResponse(unbanAt: number, violations: number): Response {
  const retryAfter = Math.max(1, Math.ceil((unbanAt - Date.now()) / 1000));
  const unbanTime = new Date(unbanAt).toISOString();

  return new Response(
    JSON.stringify({
      error: "Forbidden",
      code: "IP_BANNED",
      message:
        "Your IP has been temporarily banned due to repeated abuse. Please try again after 12 hours.",
      violations,
      retryAfter,
      unbanAt,
      unbanTime,
    }),
    {
      status: 403,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "retry-after": String(retryAfter),
        "x-ban-unban-at": unbanTime,
        "x-ban-violations": String(violations),
      },
    },
  );
}

// ── Main middleware ────────────────────────────────────────────────────────────
export function rateLimit(options: RateLimitOptions = {}) {
  const max =
    options.max ??
    (process.env.RATE_LIMIT_MAX ? Number(process.env.RATE_LIMIT_MAX) : 60);

  const windowDuration: Duration =
    options.window ?? ((process.env.RATE_LIMIT_WINDOW as Duration) || "60 s");

  const prefix = options.prefix ?? "calendarbali:ratelimit";
  const getKey = options.keyGenerator ?? defaultClientKey;
  const shouldSkip = options.skip;
  const errorMessage =
    options.message ?? "Too many requests. Please try again later.";

  const banAfterViolations = options.banAfterViolations ?? 3;
  const banDurationMs = options.banDurationMs ?? 43_200_000; // 12 hours

  const redis = getRedisClient();

  const upstashLimiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(max, windowDuration),
        prefix,
        analytics: true,
      })
    : null;

  // ── Request handler ──────────────────────────────────────────────────────────
  return new Elysia({ name: "upstash-rate-limit" }).onRequest(
    async ({ request, set }) => {
      if (shouldSkip && shouldSkip(request)) {
        return;
      }

      const key = getKey(request);
      const now = Date.now();

      // ── 1. CHECK BAN (Redis) ────────────────────────────────────────────────
      if (redis) {
        try {
          const banKey = KEY_BAN(prefix, key);
          const banData = await redis.get<BanRecord>(banKey);

          if (banData && banData.unbanAt > now) {
            return banResponse(banData.unbanAt, banData.violations);
          }
        } catch (err) {
          console.warn("[RateLimit] Redis ban check error:", err);
          // Fall through — don't block on Redis errors
        }
      } else {
        // In-memory ban check
        const ban = memoryBans.get(key);
        if (ban && ban.unbanAt > now) {
          return banResponse(ban.unbanAt, ban.violations);
        }
        if (ban && ban.unbanAt <= now) {
          memoryBans.delete(key);
          memoryViolations.delete(key);
        }
      }

      // ── 2. UPSTASH RATE LIMIT ───────────────────────────────────────────────
      if (upstashLimiter && redis) {
        try {
          const result = await upstashLimiter.limit(key);

          set.headers["x-ratelimit-limit"] = String(result.limit);
          set.headers["x-ratelimit-remaining"] = String(result.remaining);
          set.headers["x-ratelimit-reset"] = String(result.reset);

          if (!result.success) {
            // ── Increment violation counter ──────────────────────────────────
            const violationKey = KEY_VIOLATION(prefix, key);

            // Increment with TTL of 1 hour window for violations
            const violations = await redis.incr(violationKey);
            if (violations === 1) {
              // Set TTL of 1 hour on first violation so stale counters expire
              await redis.expire(violationKey, 3600);
            }

            // ── Ban if threshold reached ─────────────────────────────────────
            if (violations >= banAfterViolations) {
              const banKey = KEY_BAN(prefix, key);
              const unbanAt = now + banDurationMs;
              const banRecord: BanRecord = {
                bannedAt: now,
                unbanAt,
                violations,
              };

              // Store ban record; TTL slightly longer than ban duration
              const banTtlSeconds = Math.ceil(banDurationMs / 1000) + 60;
              await redis.set(banKey, banRecord, { ex: banTtlSeconds });

              console.warn(
                `[RateLimit] IP BANNED: ${key} — violations: ${violations} — unban at: ${new Date(unbanAt).toISOString()}`,
              );

              return banResponse(unbanAt, violations);
            }

            // ── Not yet banned — regular 429 ─────────────────────────────────
            const retryAfter = Math.max(
              1,
              Math.ceil((result.reset - now) / 1000),
            );

            return new Response(
              JSON.stringify({
                error: "Too Many Requests",
                message: errorMessage,
                limit: result.limit,
                remaining: result.remaining,
                resetAt: result.reset,
                retryAfter,
                violations,
                warnBanAfter: banAfterViolations,
              }),
              {
                status: 429,
                headers: {
                  "content-type": "application/json; charset=utf-8",
                  "retry-after": String(retryAfter),
                  "x-ratelimit-limit": String(result.limit),
                  "x-ratelimit-remaining": String(result.remaining),
                  "x-ratelimit-reset": String(result.reset),
                  "x-ratelimit-violations": String(violations),
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

      // ── 3. IN-MEMORY FALLBACK ───────────────────────────────────────────────
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
        // Track violations in memory
        const violations = (memoryViolations.get(key) ?? 0) + 1;
        memoryViolations.set(key, violations);

        // Ban if threshold reached
        if (violations >= banAfterViolations) {
          const unbanAt = now + banDurationMs;
          memoryBans.set(key, { bannedAt: now, unbanAt, violations });
          memoryViolations.delete(key);
          memoryStore.delete(key);

          console.warn(
            `[RateLimit] IP BANNED (memory): ${key} — violations: ${violations} — unban at: ${new Date(unbanAt).toISOString()}`,
          );

          return banResponse(unbanAt, violations);
        }

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
            violations,
            warnBanAfter: banAfterViolations,
          }),
          {
            status: 429,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "retry-after": String(retryAfter),
              "x-ratelimit-limit": String(max),
              "x-ratelimit-remaining": "0",
              "x-ratelimit-reset": String(current.resetAt),
              "x-ratelimit-violations": String(violations),
            },
          },
        );
      }

      // Cleanup memory stores occasionally
      if (memoryStore.size > 5_000) {
        for (const [k, v] of memoryStore.entries()) {
          if (v.resetAt <= now) memoryStore.delete(k);
        }
      }
      if (memoryBans.size > 1_000) {
        for (const [k, v] of memoryBans.entries()) {
          if (v.unbanAt <= now) {
            memoryBans.delete(k);
            memoryViolations.delete(k);
          }
        }
      }
    },
  );
}

export default rateLimit;
