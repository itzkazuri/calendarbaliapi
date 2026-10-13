import { Elysia } from "elysia";
import { SakaCalendar } from "../../engine/rahinanbali";
import { getHariRaya } from "../../engine/rahinanbali/hariRaya";
import { formatISODate, parseISODate, parseYear, toDateRange } from "../utils/date";
import { createRouteRateLimit } from "../middleware/rateLimit";

function buildResponse(date: Date) {
  const cal = new SakaCalendar(date);
  const hariRaya = getHariRaya(cal);
  const saka = cal.getSakaDate();
  const wuku = cal.getWukuInfo();
  const saptawara = cal.getSaptawaraInfo();
  const pancawara = cal.getPancawaraInfo();

  return {
    tanggal: formatISODate(date),
    hariRaya,
    saka,
    pawukon: {
      noWuku: wuku.noWuku,
      angkaWuku: wuku.angkaWuku,
      uripWuku: wuku.uripWuku,
      noSaptawara: saptawara.noSaptawara,
      uripSaptawara: saptawara.uripSaptawara,
      noPancawara: pancawara.noPancawara,
      uripPancawara: pancawara.uripPancawara,
      noTriwara: cal.getTriwara(),
    },
  };
}

// Rate limiter ketat per IP khusus untuk endpoint rahinan seluruh tahun (1 request per 60 detik).
// Jika kena spam / abuse lagi, IP otomatis dibanned selama 12 jam.
const rahinanYearRateLimit = createRouteRateLimit({
  max: 1,
  window: "60 s",
  prefix: "calendarbali:ratelimit:rahinan-year",
  banAfterViolations: 2, // Pelanggaran berulang/spam langsung memicu ban
  banDurationMs: 43_200_000, // Durasi ban 12 jam (43.200.000 ms)
  message:
    "Endpoint hitung rahinan tahunan dibatasi maksimum 1 kali request per menit per IP. Jika melakukan spam, IP Anda akan dibanned selama 12 jam.",
});

function handleYearRahinan(query: Record<string, string | undefined>, set: any) {
  const rawYear = query.year ?? query.tahun;
  if (!rawYear) {
    set.status = 400;
    return {
      error: "Bad Request",
      message: "Parameter year wajib diisi (contoh: /api/rahinan/year?year=2026).",
    };
  }

  const year = parseYear(rawYear, 1900, 2100);
  if (year === null) {
    set.status = 400;
    return {
      error: "Bad Request",
      message: "Tahun tidak valid. Masukkan tahun antara 1900 dan 2100.",
    };
  }

  const filterNama = (query.nama ?? query.cari)?.trim().toLowerCase();

  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const allDays = toDateRange(start, end);

  let data = allDays
    .map((date) => buildResponse(date))
    .filter((item) => item.hariRaya.length > 0);

  if (filterNama) {
    data = data
      .map((item) => ({
        ...item,
        hariRaya: item.hariRaya.filter((hr) =>
          hr.nama.toLowerCase().includes(filterNama),
        ),
      }))
      .filter((item) => item.hariRaya.length > 0);
  }

  return {
    tahun: year,
    totalHari: allDays.length,
    totalRahinan: data.length,
    data,
  };
}

export const rahinanBaliRoutes = new Elysia({ name: "rahinan-bali" })
  .get("/rahinan", ({ query, set }) => {
    if (!query.date) {
      set.status = 400;
      return { error: "Parameter date wajib (YYYY-MM-DD)." };
    }

    const date = parseISODate(query.date, 1900, 2100);
    if (!date) {
      set.status = 400;
      return { error: "Format date tidak valid. Gunakan format YYYY-MM-DD (rentang tahun 1900-2100)." };
    }

    return buildResponse(date);
  })
  .get("/rahinan/year", ({ query, set }) => handleYearRahinan(query, set), {
    beforeHandle: async ({ request, set }) => {
      return await rahinanYearRateLimit({ request, set });
    },
  })
  .get("/rahinan/tahun", ({ query, set }) => handleYearRahinan(query, set), {
    beforeHandle: async ({ request, set }) => {
      return await rahinanYearRateLimit({ request, set });
    },
  })
  .get("/rahinan/range", ({ query, set }) => {
    if (!query.start || !query.end) {
      set.status = 400;
      return { error: "Parameter start dan end wajib (YYYY-MM-DD)." };
    }

    const start = parseISODate(query.start, 1900, 2100);
    const end = parseISODate(query.end, 1900, 2100);
    if (!start || !end) {
      set.status = 400;
      return { error: "Format tanggal tidak valid. Gunakan format YYYY-MM-DD (rentang tahun 1900-2100)." };
    }

    if (start > end) {
      set.status = 400;
      return { error: "start tidak boleh lebih besar dari end." };
    }

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 1100) {
      set.status = 400;
      return {
        error: "Rentang tanggal maksimal adalah 3 tahun (1100 hari). Untuk 1 tahun gunakan endpoint /api/rahinan/year.",
      };
    }

    const filterNama = (query.nama ?? query.cari)?.trim().toLowerCase();

    let data = toDateRange(start, end)
      .map((date) => buildResponse(date))
      .filter((item) => item.hariRaya.length > 0);

    if (filterNama) {
      data = data
        .map((item) => ({
          ...item,
          hariRaya: item.hariRaya.filter((hr) =>
            hr.nama.toLowerCase().includes(filterNama),
          ),
        }))
        .filter((item) => item.hariRaya.length > 0);
    }

    return {
      start: formatISODate(start),
      end: formatISODate(end),
      total: data.length,
      data,
    };
  });
