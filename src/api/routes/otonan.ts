import { Elysia } from "elysia";
import {
  cariOtonan,
  isOtonanHariIni,
  otonanBerikutnya,
  otonanDalamTahun,
} from "../../engine/rahinanbali/otonanEngine";
import { formatISODate, parseISODate } from "../utils/date";

function parseYear(input: string | undefined): number | null {
  if (!input) return null;
  const year = Number(input);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  return year;
}

function parseCount(input: string | undefined): number {
  if (!input) return 6;
  const value = Number(input);
  if (!Number.isFinite(value) || value < 1) return 6;
  return Math.min(50, Math.trunc(value));
}

function mapJadwal(jadwal: ReturnType<typeof otonanDalamTahun> | ReturnType<typeof cariOtonan>["jadwalOtonan"]) {
  return jadwal.map((item) => ({
    tanggal: formatISODate(item.tanggal),
    siklus: item.siklus,
    usiaDari: item.usiaDari,
    usiaLabel: item.usiaLabel,
    isOtonanBesar: item.isOtonanBesar,
  }));
}

export const otonanRoutes = new Elysia({ name: "otonan" })
  .get("/otonan", ({ query, set }) => {
    if (!query.birth) {
      set.status = 400;
      return { error: "Parameter birth wajib (YYYY-MM-DD)." };
    }

    const birth = parseISODate(query.birth);
    if (!birth) {
      set.status = 400;
      return { error: "Format birth tidak valid. Gunakan YYYY-MM-DD." };
    }

    const from = query.from ? parseISODate(query.from) : null;
    if (query.from && !from) {
      set.status = 400;
      return { error: "Format from tidak valid. Gunakan YYYY-MM-DD." };
    }

    const count = parseCount(query.count);

    const hasil = cariOtonan(birth, count, from ?? new Date());

    return {
      kelahiran: {
        ...hasil.kelahiran,
        tanggal: formatISODate(hasil.kelahiran.tanggal),
      },
      jadwalOtonan: mapJadwal(hasil.jadwalOtonan),
      berikutnya: hasil.berikutnya
        ? {
            ...hasil.berikutnya,
            tanggal: formatISODate(hasil.berikutnya.tanggal),
          }
        : null,
      jumlahOton: hasil.jumlahOton,
    };
  })
  .get("/otonan/next", ({ query, set }) => {
    if (!query.birth) {
      set.status = 400;
      return { error: "Parameter birth wajib (YYYY-MM-DD)." };
    }

    const birth = parseISODate(query.birth);
    if (!birth) {
      set.status = 400;
      return { error: "Format birth tidak valid. Gunakan YYYY-MM-DD." };
    }

    const from = query.from ? parseISODate(query.from) : null;
    if (query.from && !from) {
      set.status = 400;
      return { error: "Format from tidak valid. Gunakan YYYY-MM-DD." };
    }

    const next = otonanBerikutnya(birth, from ?? new Date());
    return {
      birth: formatISODate(birth),
      next: next
        ? {
            ...next,
            tanggal: formatISODate(next.tanggal),
          }
        : null,
    };
  })
  .get("/otonan/check", ({ query, set }) => {
    if (!query.birth || !query.date) {
      set.status = 400;
      return { error: "Parameter birth dan date wajib (YYYY-MM-DD)." };
    }

    const birth = parseISODate(query.birth);
    const date = parseISODate(query.date);
    if (!birth || !date) {
      set.status = 400;
      return { error: "Format tanggal tidak valid. Gunakan YYYY-MM-DD." };
    }

    const ok = isOtonanHariIni(birth, date);
    return {
      birth: formatISODate(birth),
      date: formatISODate(date),
      otonan: ok,
    };
  })
  .get("/otonan/year", ({ query, set }) => {
    if (!query.birth || !query.year) {
      set.status = 400;
      return { error: "Parameter birth dan year wajib." };
    }

    const birth = parseISODate(query.birth);
    const year = parseYear(query.year);
    if (!birth || year === null) {
      set.status = 400;
      return { error: "Format birth atau year tidak valid." };
    }

    const jadwal = otonanDalamTahun(birth, year);

    return {
      birth: formatISODate(birth),
      year,
      total: jadwal.length,
      data: mapJadwal(jadwal),
    };
  });
