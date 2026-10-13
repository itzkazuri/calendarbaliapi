import { Elysia } from "elysia";
import { calendarRoutes } from "./routes/calendar";
import { dewasaAyuRoutes } from "./routes/dewasaAyu";
import { liburNasionalRoutes } from "./routes/liburNasional";
import { metaRoutes } from "./routes/meta";
import { odalanRoutes } from "./routes/odalan";
import { otonanRoutes } from "./routes/otonan";
import { rahinanBaliRoutes } from "./routes/rahinanBali";
import { upacaraBesarRoutes } from "./routes/upacaraBesar";
import { adminRoutes } from "./routes/admin";
import { indexHtml } from "./indexHtml";
import { faviconSvg, iconPngBuffer } from "./assetsData";
import { rateLimit } from "./middleware/rateLimit";

export const app = new Elysia()
  .use(
    rateLimit({
      skip: (request) => {
        const url = new URL(request.url);
        // Lewati halaman root dan static assets agar tidak menghabiskan kuota rate limit
        return (
          url.pathname === "/" ||
          url.pathname === "/favicon.ico" ||
          url.pathname.startsWith("/assets")
        );
      },
    }),
  )
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
  .get("/", () => {
    return new Response(indexHtml, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  })
  .get("/favicon.ico", () => {
    return new Response(faviconSvg, {
      headers: {
        "content-type": "image/svg+xml",
        "cache-control": "public, max-age=86400",
      },
    });
  })
  .get("/assets/*", async ({ params, set }) => {
    const filename = (params as Record<string, string>)["*"] || "";
    const safePath = filename.replace(/\.\./g, "");

    if (safePath === "favoicon.svg") {
      return new Response(faviconSvg, {
        headers: {
          "content-type": "image/svg+xml",
          "cache-control": "public, max-age=86400",
        },
      });
    }

    if (safePath === "icon.png" || safePath === "logo.png") {
      return new Response(iconPngBuffer, {
        headers: {
          "content-type": "image/png",
          "cache-control": "public, max-age=86400",
        },
      });
    }

    const file = Bun.file(`assets/${safePath}`);
    if (await file.exists()) {
      return file;
    }

    set.status = 404;
    return { error: "Not Found", message: "Asset tidak ditemukan." };
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
      .use(calendarRoutes)
      .use(adminRoutes),
  );

export default app;
