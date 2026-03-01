import { Elysia } from "elysia";
import {
  cariHariTerbaik,
  cariHariTerbaikBerikutnya,
  hitungDewasaAyu,
  type JenisUpacara,
} from "../../engine/rahinanbali/dewasaAyuEngine";
import { formatISODate, parseISODate } from "../utils/date";

function parseKonteks(input: string | undefined): JenisUpacara {
  const value = (input ?? "umum") as JenisUpacara;
  return value;
}

function parseTopN(input: string | undefined, fallback: number): number {
  if (!input) return fallback;
  const value = Number(input);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.min(50, Math.trunc(value));
}

function mapDewasa(result: ReturnType<typeof hitungDewasaAyu>) {
  return {
    ...result,
    tanggal: formatISODate(result.tanggal),
  };
}

export const dewasaAyuRoutes = new Elysia({ name: "dewasa-ayu" })
  .get("/dewasa-ayu", ({ query, set }) => {
    if (!query.date) {
      set.status = 400;
      return { error: "Parameter date wajib (YYYY-MM-DD)." };
    }

    const date = parseISODate(query.date);
    if (!date) {
      set.status = 400;
      return { error: "Format date tidak valid. Gunakan YYYY-MM-DD." };
    }

    const konteks = parseKonteks(query.konteks);
    const hasil = hitungDewasaAyu(date, konteks);

    return mapDewasa(hasil);
  })
  .get("/dewasa-ayu/best", ({ query, set }) => {
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

    const konteks = parseKonteks(query.konteks);
    const topN = parseTopN(query.topN, 5);

    const hasil = cariHariTerbaik(start, end, konteks, topN);
    return {
      start: formatISODate(start),
      end: formatISODate(end),
      total: hasil.length,
      data: hasil.map(mapDewasa),
    };
  })
  .get("/dewasa-ayu/next", ({ query }) => {
    const from = query.from ? parseISODate(query.from) : null;
    const base = from ?? new Date();

    const konteks = parseKonteks(query.konteks);
    const hariKedepan = query.days ? Number(query.days) : 30;
    const topN = parseTopN(query.topN, 3);

    const hasil = cariHariTerbaikBerikutnya(
      base,
      Number.isFinite(hariKedepan) ? Math.trunc(hariKedepan) : 30,
      konteks,
      topN,
    );

    return {
      from: formatISODate(base),
      total: hasil.length,
      data: hasil.map(mapDewasa),
    };
  });
