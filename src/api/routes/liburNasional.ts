import { Elysia } from "elysia";
import type { KategoriLibur } from "../../engine/liburnasional";
import {
  cekLiburNasional,
  getLiburNasional,
  getLiburPerKategori,
  hitungHariKerja,
  liburBerikutnya,
} from "../../engine/liburnasional";
import { formatISODate, normalizeDate, parseISODate, parseYear } from "../utils/date";

function parseCategories(input: string | undefined): KategoriLibur[] | undefined {
  if (!input) return undefined;
  const parts = input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as KategoriLibur[];
  return parts.length ? parts : undefined;
}

function parseBoolean(input: string | undefined, defaultValue: boolean): boolean {
  if (input === undefined) return defaultValue;
  return !(input.toLowerCase() === "false" || input === "0");
}

function parseAdjustment(input: string | undefined): number {
  if (!input) return 0;
  const value = Number(input);
  if (!Number.isFinite(value)) return 0;
  return Math.trunc(value);
}

export const liburNasionalRoutes = new Elysia({ name: "libur-nasional" })
  .get("/libur-nasional", ({ query, set }) => {
    if (!query.year) {
      set.status = 400;
      return { error: "Parameter year wajib diisi (contoh: ?year=2026)." };
    }

    const year = parseYear(query.year, 1900, 2100);
    if (year === null) {
      set.status = 400;
      return { error: "Tahun tidak valid. Masukkan tahun antara 1900 dan 2100." };
    }

    const termasukCutiBersama = parseBoolean(
      query.termasukCutiBersama,
      true,
    );
    const hanyaKategori = parseCategories(query.hanyaKategori);
    const adjustmentIslam = parseAdjustment(query.adjustmentIslam);

    const data = getLiburNasional(year, {
      termasukCutiBersama,
      hanyaKategori,
      adjustmentIslam,
    }).map((item) => ({
      tanggal: formatISODate(item.tanggal),
      nama: item.nama,
      kategori: item.kategori,
      jenis: item.jenis,
      keterangan: item.keterangan ?? null,
    }));

    return {
      tahun: year,
      total: data.length,
      data,
    };
  })
  .get("/libur-nasional/per-kategori", ({ query, set }) => {
    if (!query.year) {
      set.status = 400;
      return { error: "Parameter year wajib diisi (contoh: ?year=2026)." };
    }

    const year = parseYear(query.year, 1900, 2100);
    if (year === null) {
      set.status = 400;
      return { error: "Tahun tidak valid. Masukkan tahun antara 1900 dan 2100." };
    }

    const termasukCutiBersama = parseBoolean(
      query.termasukCutiBersama,
      true,
    );
    const adjustmentIslam = parseAdjustment(query.adjustmentIslam);

    const data = getLiburPerKategori(year, {
      termasukCutiBersama,
      adjustmentIslam,
    });

    const result = Object.fromEntries(
      Object.entries(data).map(([kategori, list]) => [
        kategori,
        list.map((item) => ({
          tanggal: formatISODate(item.tanggal),
          nama: item.nama,
          kategori: item.kategori,
          jenis: item.jenis,
          keterangan: item.keterangan ?? null,
        })),
      ]),
    );

    return { tahun: year, data: result };
  })
  .get("/libur-nasional/check", ({ query, set }) => {
    if (!query.date) {
      set.status = 400;
      return { error: "Parameter date wajib (YYYY-MM-DD)." };
    }

    const date = parseISODate(query.date);
    if (!date) {
      set.status = 400;
      return { error: "Format date tidak valid. Gunakan YYYY-MM-DD." };
    }

    const termasukCutiBersama = parseBoolean(
      query.termasukCutiBersama,
      true,
    );
    const hanyaKategori = parseCategories(query.hanyaKategori);
    const adjustmentIslam = parseAdjustment(query.adjustmentIslam);

    const result = cekLiburNasional(date, {
      termasukCutiBersama,
      hanyaKategori,
      adjustmentIslam,
    });

    if (!result) {
      return {
        tanggal: formatISODate(date),
        libur: false,
        data: null,
      };
    }

    return {
      tanggal: formatISODate(result.tanggal),
      libur: true,
      data: {
        nama: result.nama,
        kategori: result.kategori,
        jenis: result.jenis,
        keterangan: result.keterangan ?? null,
      },
    };
  })
  .get("/libur-nasional/next", ({ query, set }) => {
    if (query.from) {
      const parsed = parseISODate(query.from, 1900, 2100);
      if (!parsed) {
        set.status = 400;
        return { error: "Format from tidak valid. Gunakan format YYYY-MM-DD (1900-2100)." };
      }
    }
    const from = query.from ? parseISODate(query.from, 1900, 2100) : null;
    const baseDate = from ?? new Date();
    const termasukCutiBersama = parseBoolean(
      query.termasukCutiBersama,
      true,
    );
    const hanyaKategori = parseCategories(query.hanyaKategori);
    const adjustmentIslam = parseAdjustment(query.adjustmentIslam);

    const result = liburBerikutnya(baseDate, {
      termasukCutiBersama,
      hanyaKategori,
      adjustmentIslam,
    });

    if (!result) {
      return { tanggal: null, data: null };
    }

    return {
      tanggal: formatISODate(result.tanggal),
      data: {
        nama: result.nama,
        kategori: result.kategori,
        jenis: result.jenis,
        keterangan: result.keterangan ?? null,
      },
    };
  })
  .get("/libur-nasional/workdays", ({ query, set }) => {
    if (!query.start || !query.end) {
      set.status = 400;
      return { error: "Parameter start dan end wajib (YYYY-MM-DD)." };
    }

    const start = parseISODate(query.start, 1900, 2100);
    const end = parseISODate(query.end, 1900, 2100);
    if (!start || !end) {
      set.status = 400;
      return { error: "Format tanggal tidak valid. Gunakan format YYYY-MM-DD (1900-2100)." };
    }

    if (start > end) {
      set.status = 400;
      return { error: "start tidak boleh lebih besar dari end." };
    }

    const termasukCutiBersama = parseBoolean(
      query.termasukCutiBersama,
      true,
    );
    const hanyaKategori = parseCategories(query.hanyaKategori);
    const adjustmentIslam = parseAdjustment(query.adjustmentIslam);

    const count = hitungHariKerja(normalizeDate(start), normalizeDate(end), {
      termasukCutiBersama,
      hanyaKategori,
      adjustmentIslam,
    });

    return {
      start: formatISODate(start),
      end: formatISODate(end),
      total: count,
    };
  });
