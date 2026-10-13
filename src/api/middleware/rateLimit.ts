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
const KEY_WHITELIST = (ip: string) =>
  `${process.env.ADMIN_REDIS_PREFIX || "calendarbali:admin"}:whitelist:${ip}`;

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

export interface WhitelistRecord {
  ip: string;
  whitelistedAt: number;
  expiresAt: number;
}

const memoryStore = new Map<string, MemoryBucket>();
const memoryViolations = new Map<string, number>();
const memoryBans = new Map<string, BanRecord>();
const memoryWhitelist = new Map<string, WhitelistRecord>();

// ── Client IP helper ───────────────────────────────────────────────────────────
export function defaultClientKey(request: Request): string {
  const headerValue =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for");

  if (headerValue) {
    return headerValue.split(",")[0]?.trim() || headerValue;
  }

  return "unknown";
}

// ── Admin Auth Helper ─────────────────────────────────────────────────────────
export function checkAdminAuth(request: Request): boolean {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminUser || !adminPass) return false;

  // 1. Basic Authorization Header
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Basic ")) {
    try {
      const base64 = authHeader.slice(6).trim();
      const decoded = atob(base64);
      const [u, ...pParts] = decoded.split(":");
      const p = pParts.join(":");
      if (u === adminUser && p === adminPass) return true;
    } catch {}
  }

  // 2. Custom Headers (x-admin-username & x-admin-password)
  const hUser = request.headers.get("x-admin-username");
  const hPass = request.headers.get("x-admin-password");
  if (hUser === adminUser && hPass === adminPass) return true;

  // 3. Combined Header (x-admin-key: "username:password")
  const hKey = request.headers.get("x-admin-key");
  if (hKey && hKey === `${adminUser}:${adminPass}`) return true;

  return false;
}

// ── Whitelist IP Helper (1 Jam / TTL Sesuai Config) ───────────────────────────
export async function whitelistIp(
  ip: string,
  durationSeconds = Number(process.env.ADMIN_WHITELIST_TTL || 3600),
): Promise<{ success: boolean; ip: string; expiresAt: number; expiresInSeconds: number }> {
  const redis = getRedisClient();
  const now = Date.now();
  const expiresAt = now + durationSeconds * 1000;
  const record: WhitelistRecord = { ip, whitelistedAt: now, expiresAt };

  if (redis) {
    try {
      const key = KEY_WHITELIST(ip);
      await redis.set(key, record, { ex: durationSeconds });
      // Bersihkan ban yang aktif jika sebelumnya pernah diban
      await redis.del(`calendarbali:ratelimit:ban:${ip}`);
      await redis.del(`calendarbali:ratelimit:violations:${ip}`);
      await redis.del(`calendarbali:ratelimit:rahinan-year:ban:${ip}`);
      await redis.del(`calendarbali:ratelimit:rahinan-year:violations:${ip}`);
    } catch (err) {
      console.warn("[AdminWhitelist] Redis set error:", err);
    }
  }

  // Simpan juga di memory fallback
  memoryWhitelist.set(ip, record);
  memoryBans.delete(ip);
  memoryBans.delete(`calendarbali:ratelimit:rahinan-year:${ip}`);
  memoryViolations.delete(ip);
  memoryViolations.delete(`calendarbali:ratelimit:rahinan-year:${ip}`);

  return { success: true, ip, expiresAt, expiresInSeconds: durationSeconds };
}

export async function isIpWhitelisted(ip: string): Promise<boolean> {
  const redis = getRedisClient();
  const now = Date.now();

  if (redis) {
    try {
      const key = KEY_WHITELIST(ip);
      const data = await redis.get<WhitelistRecord>(key);
      if (data && data.expiresAt > now) {
        return true;
      }
    } catch (err) {
      console.warn("[AdminWhitelist] Redis get error:", err);
    }
  }

  const mem = memoryWhitelist.get(ip);
  if (mem && mem.expiresAt > now) {
    return true;
  }
  if (mem && mem.expiresAt <= now) {
    memoryWhitelist.delete(ip);
  }

  return false;
}

export async function getWhitelistInfo(ip: string): Promise<WhitelistRecord | null> {
  const redis = getRedisClient();
  const now = Date.now();

  if (redis) {
    try {
      const key = KEY_WHITELIST(ip);
      const data = await redis.get<WhitelistRecord>(key);
      if (data && data.expiresAt > now) {
        return data;
      }
    } catch {}
  }

  const mem = memoryWhitelist.get(ip);
  if (mem && mem.expiresAt > now) return mem;
  return null;
}

export async function revokeWhitelist(ip: string): Promise<boolean> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(KEY_WHITELIST(ip));
    } catch (err) {
      console.warn("[AdminWhitelist] Redis revoke error:", err);
    }
  }
  memoryWhitelist.delete(ip);
  return true;
}

export async function unbanIp(ip: string): Promise<boolean> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(`calendarbali:ratelimit:ban:${ip}`);
      await redis.del(`calendarbali:ratelimit:violations:${ip}`);
      await redis.del(`calendarbali:ratelimit:rahinan-year:ban:${ip}`);
      await redis.del(`calendarbali:ratelimit:rahinan-year:violations:${ip}`);
    } catch {}
  }
  memoryBans.delete(ip);
  memoryBans.delete(`calendarbali:ratelimit:rahinan-year:${ip}`);
  memoryViolations.delete(ip);
  memoryViolations.delete(`calendarbali:ratelimit:rahinan-year:${ip}`);
  return true;
}

// ── Admin Failed Attempts Store & Helper ──────────────────────────────────────
const memoryAdminAttempts = new Map<string, { count: number; resetAt: number }>();

export async function banIp(
  ip: string,
  durationMs = 43_200_000,
  violations = 3,
): Promise<{ unbanAt: number; violations: number }> {
  const redis = getRedisClient();
  const now = Date.now();
  const unbanAt = now + durationMs;
  const banRecord: BanRecord = { bannedAt: now, unbanAt, violations };
  const banTtlSeconds = Math.ceil(durationMs / 1000) + 60;

  if (redis) {
    try {
      await redis.set(KEY_BAN("calendarbali:ratelimit", ip), banRecord, { ex: banTtlSeconds });
      await redis.set(KEY_BAN("calendarbali:ratelimit:rahinan-year", ip), banRecord, { ex: banTtlSeconds });
    } catch (err) {
      console.warn("[BanIP] Redis ban error:", err);
    }
  }

  memoryBans.set(ip, banRecord);
  memoryBans.set(`calendarbali:ratelimit:rahinan-year:${ip}`, banRecord);

  return { unbanAt, violations };
}

export async function getBanStatus(ip: string): Promise<BanRecord | null> {
  const redis = getRedisClient();
  const now = Date.now();

  if (redis) {
    try {
      const banData = await redis.get<BanRecord>(KEY_BAN("calendarbali:ratelimit", ip));
      if (banData && banData.unbanAt > now) {
        return banData;
      }
    } catch {}
  }

  const ban = memoryBans.get(ip) ?? memoryBans.get(`calendarbali:ratelimit:rahinan-year:${ip}`);
  if (ban && ban.unbanAt > now) return ban;
  return null;
}

export async function recordAdminFailedAttempt(
  ip: string,
): Promise<{ banned: boolean; attempts: number; remainingAttempts: number; unbanAt?: number }> {
  const redis = getRedisClient();
  const now = Date.now();
  const keyAttempts = `${process.env.ADMIN_REDIS_PREFIX || "calendarbali:admin"}:attempts:${ip}`;
  const windowMs = 3600_000;

  let attempts = 1;

  if (redis) {
    try {
      attempts = await redis.incr(keyAttempts);
      if (attempts === 1) {
        await redis.expire(keyAttempts, 3600);
      }
    } catch {
      const mem = memoryAdminAttempts.get(ip);
      if (!mem || mem.resetAt <= now) {
        attempts = 1;
        memoryAdminAttempts.set(ip, { count: 1, resetAt: now + windowMs });
      } else {
        mem.count += 1;
        attempts = mem.count;
        memoryAdminAttempts.set(ip, mem);
      }
    }
  } else {
    const mem = memoryAdminAttempts.get(ip);
    if (!mem || mem.resetAt <= now) {
      attempts = 1;
      memoryAdminAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    } else {
      mem.count += 1;
      attempts = mem.count;
      memoryAdminAttempts.set(ip, mem);
    }
  }

  if (attempts >= 3) {
    const { unbanAt } = await banIp(ip, 43_200_000, attempts);
    if (redis) {
      try {
        await redis.del(keyAttempts);
      } catch {}
    }
    memoryAdminAttempts.delete(ip);
    return { banned: true, attempts, remainingAttempts: 0, unbanAt };
  }

  return { banned: false, attempts, remainingAttempts: 3 - attempts };
}

export async function clearAdminFailedAttempts(ip: string): Promise<void> {
  const redis = getRedisClient();
  const keyAttempts = `${process.env.ADMIN_REDIS_PREFIX || "calendarbali:admin"}:attempts:${ip}`;
  if (redis) {
    try {
      await redis.del(keyAttempts);
    } catch {}
  }
  memoryAdminAttempts.delete(ip);
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
export function banResponse(unbanAt: number, violations: number, customMessage?: string): Response {
  const retryAfter = Math.max(1, Math.ceil((unbanAt - Date.now()) / 1000));
  const unbanTime = new Date(unbanAt).toISOString();

  return new Response(
    JSON.stringify({
      error: "Forbidden",
      code: "IP_BANNED",
      message:
        customMessage ??
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

  async function handleCheck(request: Request, set: any): Promise<Response | undefined> {
    if (shouldSkip && shouldSkip(request)) {
      return;
    }

    const key = getKey(request);
    const now = Date.now();

    // ── 0. CHECK ADMIN AUTH & WHITELIST (KEBAL RATE LIMIT) ──────────────────
    if (checkAdminAuth(request)) {
      whitelistIp(key).catch(() => {});
      set.headers["x-ratelimit-admin"] = "immune-active";
      set.headers["x-ratelimit-limit"] = "unlimited";
      set.headers["x-ratelimit-remaining"] = "unlimited";
      return;
    }

    if (await isIpWhitelisted(key)) {
      set.headers["x-ratelimit-admin"] = "whitelist-active";
      set.headers["x-ratelimit-limit"] = "unlimited";
      set.headers["x-ratelimit-remaining"] = "unlimited";
      return;
    }

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
          const violationKey = KEY_VIOLATION(prefix, key);
          const violations = await redis.incr(violationKey);
          if (violations === 1) {
            await redis.expire(violationKey, 3600);
          }

          if (violations >= banAfterViolations) {
            const banKey = KEY_BAN(prefix, key);
            const unbanAt = now + banDurationMs;
            const banRecord: BanRecord = {
              bannedAt: now,
              unbanAt,
              violations,
            };

            const banTtlSeconds = Math.ceil(banDurationMs / 1000) + 60;
            await redis.set(banKey, banRecord, { ex: banTtlSeconds });

            console.warn(
              `[RateLimit] IP BANNED: ${key} — violations: ${violations} — unban at: ${new Date(unbanAt).toISOString()}`,
            );

            return banResponse(unbanAt, violations);
          }

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
      const violations = (memoryViolations.get(key) ?? 0) + 1;
      memoryViolations.set(key, violations);

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
  }

  // ── Request handler ──────────────────────────────────────────────────────────
  return new Elysia({ name: "upstash-rate-limit" }).onRequest(
    async ({ request, set }) => {
      return await handleCheck(request, set);
    },
  );
}

export function createRouteRateLimit(options: RateLimitOptions = {}) {
  const max = options.max ?? 1;
  const windowDuration: Duration = options.window ?? "60 s";
  const prefix = options.prefix ?? "calendarbali:ratelimit:custom";
  const getKey = options.keyGenerator ?? defaultClientKey;
  const shouldSkip = options.skip;
  const errorMessage =
    options.message ?? "Too many requests. Please try again later.";

  const banAfterViolations = options.banAfterViolations ?? 3;
  const banDurationMs = options.banDurationMs ?? 43_200_000;

  const redis = getRedisClient();
  const upstashLimiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(max, windowDuration),
        prefix,
        analytics: true,
      })
    : null;

  return async ({ request, set }: { request: Request; set: any }): Promise<Response | undefined> => {
    if (shouldSkip && shouldSkip(request)) return;

    const key = getKey(request);
    const now = Date.now();
    const memoryKey = `${prefix}:${key}`;

    // ── 0. CHECK ADMIN AUTH & WHITELIST (KEBAL RATE LIMIT) ──────────────────
    if (checkAdminAuth(request)) {
      whitelistIp(key).catch(() => {});
      set.headers["x-ratelimit-admin"] = "immune-active";
      set.headers["x-ratelimit-limit"] = "unlimited";
      set.headers["x-ratelimit-remaining"] = "unlimited";
      return;
    }

    if (await isIpWhitelisted(key)) {
      set.headers["x-ratelimit-admin"] = "whitelist-active";
      set.headers["x-ratelimit-limit"] = "unlimited";
      set.headers["x-ratelimit-remaining"] = "unlimited";
      return;
    }

    if (redis) {
      try {
        const banKey = KEY_BAN(prefix, key);
        const banData = await redis.get<BanRecord>(banKey);
        if (banData && banData.unbanAt > now) {
          return banResponse(banData.unbanAt, banData.violations);
        }
      } catch (err) {
        console.warn("[RouteRateLimit] Redis ban check error:", err);
      }
    } else {
      const ban = memoryBans.get(memoryKey) ?? memoryBans.get(key);
      if (ban && ban.unbanAt > now) {
        return banResponse(ban.unbanAt, ban.violations);
      }
      if (ban && ban.unbanAt <= now) {
        memoryBans.delete(memoryKey);
        memoryViolations.delete(memoryKey);
        memoryBans.delete(key);
        memoryViolations.delete(key);
      }
    }

    if (upstashLimiter && redis) {
      try {
        const result = await upstashLimiter.limit(key);
        set.headers["x-ratelimit-limit"] = String(result.limit);
        set.headers["x-ratelimit-remaining"] = String(result.remaining);
        set.headers["x-ratelimit-reset"] = String(result.reset);

        if (!result.success) {
          const violationKey = KEY_VIOLATION(prefix, key);
          const violations = await redis.incr(violationKey);
          if (violations === 1) await redis.expire(violationKey, 3600);

          if (violations >= banAfterViolations) {
            const banKey = KEY_BAN(prefix, key);
            const unbanAt = now + banDurationMs;
            const banRecord: BanRecord = { bannedAt: now, unbanAt, violations };
            const banTtlSeconds = Math.ceil(banDurationMs / 1000) + 60;
            await redis.set(banKey, banRecord, { ex: banTtlSeconds });
            return banResponse(unbanAt, violations);
          }

          const retryAfter = Math.max(1, Math.ceil((result.reset - now) / 1000));
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
        console.warn("[RouteRateLimit] Upstash Redis error, falling back to memory:", err);
      }
    }

    // In-memory fallback with dedicated prefix to prevent bucket mixing
    const windowMs = 60_000;
    const bucket = memoryStore.get(memoryKey);

    if (!bucket || bucket.resetAt <= now) {
      memoryStore.set(memoryKey, { count: 1, resetAt: now + windowMs });
    } else {
      bucket.count += 1;
      memoryStore.set(memoryKey, bucket);
    }

    const current = memoryStore.get(memoryKey)!;
    const remaining = Math.max(0, max - current.count);

    set.headers["x-ratelimit-limit"] = String(max);
    set.headers["x-ratelimit-remaining"] = String(remaining);
    set.headers["x-ratelimit-reset"] = String(current.resetAt);

    if (current.count > max) {
      const violations = (memoryViolations.get(memoryKey) ?? 0) + 1;
      memoryViolations.set(memoryKey, violations);

      if (violations >= banAfterViolations) {
        const unbanAt = now + banDurationMs;
        memoryBans.set(memoryKey, { bannedAt: now, unbanAt, violations });
        memoryViolations.delete(memoryKey);
        memoryStore.delete(memoryKey);
        return banResponse(unbanAt, violations);
      }

      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
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
  };
}

export default rateLimit;
