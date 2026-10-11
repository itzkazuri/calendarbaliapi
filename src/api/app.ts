import { Elysia } from "elysia";
import { calendarRoutes } from "./routes/calendar";
import { dewasaAyuRoutes } from "./routes/dewasaAyu";
import { liburNasionalRoutes } from "./routes/liburNasional";
import { metaRoutes } from "./routes/meta";
import { odalanRoutes } from "./routes/odalan";
import { otonanRoutes } from "./routes/otonan";
import { rahinanBaliRoutes } from "./routes/rahinanBali";
import { upacaraBesarRoutes } from "./routes/upacaraBesar";

interface Bucket {
  count: number;
  resetAt: number;
}

const windowMs = 60_000;
const max = 120;
const store = new Map<string, Bucket>();

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

export const app = new Elysia()
  .onBeforeHandle(({ request, set }) => {
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
        message: "Terlalu banyak permintaan. Coba lagi setelah beberapa saat.",
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
  })
  .onError(({ code, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      return { error: "Bad Request", message: "Parameter tidak valid." };
    }

    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        error: "Not Found",
        message: "Route tidak ditemukan. Cek kembali path API.",
      };
    }

    set.status = 500;
    return {
      error: "Internal Server Error",
      message: "Terjadi kesalahan di server. Coba lagi nanti.",
    };
  })
  .get("/", () => Bun.file("index.html"))
  .get("/favicon.ico", () => Bun.file("assets/favoicon.svg"))
  .get("/assets/*", async ({ params, set }) => {
    const filename = (params as Record<string, string>)["*"] || "";
    const safePath = filename.replace(/\.\./g, "");
    let file = Bun.file(`assets/${safePath}`);
    if (!(await file.exists()) && safePath === "logo.png") {
      file = Bun.file("assets/icon.png");
    }
    if (!(await file.exists())) {
      set.status = 404;
      return { error: "Not Found", message: "Asset tidak ditemukan." };
    }
    return file;
  })
  .group("/api", (api: any) =>
    api
      .use(metaRoutes)
      .use(dewasaAyuRoutes)
      .use(liburNasionalRoutes)
      .use(rahinanBaliRoutes)
      .use(otonanRoutes)
      .use(odalanRoutes)
      .use(upacaraBesarRoutes)
      .use(calendarRoutes),
  );

export default app;
