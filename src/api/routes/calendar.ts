import { Elysia } from "elysia";
import { getLiburNasional } from "../../engine/liburnasional";
import { SakaCalendar } from "../../engine/rahinanbali";
import { getHariRaya } from "../../engine/rahinanbali/hariRaya";
import { formatISODate, normalizeDate } from "../utils/date";

function parseYear(input: string | undefined): number | null {
  if (!input) return null;
  const year = Number(input);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  return year;
}

function parseMonth(input: string | undefined): number | null {
  if (!input) return null;
  const month = Number(input);
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return month;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export const calendarRoutes = new Elysia({ name: "calendar" }).get(
  "/calendar",
  ({ query, set }) => {
    const year = parseYear(query.year);
    const month = parseMonth(query.month);

    if (year === null || month === null) {
      set.status = 400;
      return { error: "Parameter year dan month wajib (contoh: 2026&month=3)." };
    }

    const daysInMonth = getDaysInMonth(year, month);

    const libur = getLiburNasional(year, { termasukCutiBersama: true });
    const liburMap = new Map<string, typeof libur>();
    for (const item of libur) {
      const key = formatISODate(item.tanggal);
      const list = liburMap.get(key) ?? [];
      list.push(item);
      liburMap.set(key, list);
    }

    const data = [] as Array<{
      tanggal: string;
      liburNasional: Array<{
        nama: string;
        kategori: string;
        jenis: string;
        keterangan: string | null;
      }>;
      rahinan: Array<{ nama: string; deskripsi?: string }>;
    }>;

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = normalizeDate(new Date(year, month - 1, day));
      const key = formatISODate(date);
      const hariLibur = liburMap.get(key) ?? [];

      const cal = new SakaCalendar(date);
      const rahinan = getHariRaya(cal);

      data.push({
        tanggal: key,
        liburNasional: hariLibur.map((item) => ({
          nama: item.nama,
          kategori: item.kategori,
          jenis: item.jenis,
          keterangan: item.keterangan ?? null,
        })),
        rahinan,
      });
    }

    return {
      tahun: year,
      bulan: month,
      totalHari: daysInMonth,
      data,
    };
  },
);
