import { Elysia } from "elysia";
import { SakaCalendar } from "../../engine/rahinanbali";
import { getHariRaya } from "../../engine/rahinanbali/hariRaya";
import { formatISODate, parseISODate, toDateRange } from "../utils/date";

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

export const rahinanBaliRoutes = new Elysia({ name: "rahinan-bali" })
  .get("/rahinan", ({ query, set }) => {
    if (!query.date) {
      set.status = 400;
      return { error: "Parameter date wajib (YYYY-MM-DD)." };
    }

    const date = parseISODate(query.date);
    if (!date) {
      set.status = 400;
      return { error: "Format date tidak valid. Gunakan YYYY-MM-DD." };
    }

    return buildResponse(date);
  })
  .get("/rahinan/range", ({ query, set }) => {
    if (!query.start || !query.end) {
      set.status = 400;
      return { error: "Parameter start dan end wajib (YYYY-MM-DD)." };
    }

    const start = parseISODate(query.start);
    const end = parseISODate(query.end);
    if (!start || !end) {
      set.status = 400;
      return { error: "Format tanggal tidak valid. Gunakan YYYY-MM-DD." };
    }

    if (start > end) {
      set.status = 400;
      return { error: "start tidak boleh lebih besar dari end." };
    }

    const data = toDateRange(start, end)
      .map((date) => buildResponse(date))
      .filter((item) => item.hariRaya.length > 0);

    return {
      start: formatISODate(start),
      end: formatISODate(end),
      total: data.length,
      data,
    };
  });
