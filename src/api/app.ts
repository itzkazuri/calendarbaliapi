import { Elysia } from "elysia";
import { rateLimit } from "./middleware/rateLimit";
import { calendarRoutes } from "./routes/calendar";
import { dewasaAyuRoutes } from "./routes/dewasaAyu";
import { liburNasionalRoutes } from "./routes/liburNasional";
import { metaRoutes } from "./routes/meta";
import { odalanRoutes } from "./routes/odalan";
import { otonanRoutes } from "./routes/otonan";
import { rahinanBaliRoutes } from "./routes/rahinanBali";
import { upacaraBesarRoutes } from "./routes/upacaraBesar";

export const app = new Elysia()
  .use(rateLimit({ windowMs: 60_000, max: 120 }))
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
  .get("/", () => ({ status: "ok" }))
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
