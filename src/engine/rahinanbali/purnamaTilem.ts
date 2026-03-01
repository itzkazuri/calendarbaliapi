// ============================================================
// purnamaTilem.ts — Perhitungan Purnama/Tilem (Rahinan)
// ============================================================

import { SakaCalendar } from "./SakaCalendar";

export type JenisHariSuci = "purnama" | "tilem";

export interface HariSuci {
  date: Date;
  jenis: JenisHariSuci;
  nama: string;
  noSasih: number;
  penanggal: number;
  isPangelong: boolean;
}

export interface OpsiCariHariSuci {
  jenis?: JenisHariSuci;
  limit?: number;
}

function isPurnama(cal: SakaCalendar): boolean {
  const saka = cal.getSakaDate();
  return saka.penanggal === 15 && !saka.isPangelong;
}

function isTilem(cal: SakaCalendar): boolean {
  const saka = cal.getSakaDate();
  return saka.penanggal === 15 && saka.isPangelong;
}

export function cariPurnamaTilem(
  mulai: Date,
  akhir: Date,
  opsi: OpsiCariHariSuci = {},
): HariSuci[] {
  const hasil: HariSuci[] = [];
  const cursor = new Date(mulai.getFullYear(), mulai.getMonth(), mulai.getDate());
  const end = new Date(akhir.getFullYear(), akhir.getMonth(), akhir.getDate());

  while (cursor <= end) {
    const cal = new SakaCalendar(cursor);
    const saka = cal.getSakaDate();

    const purnama = isPurnama(cal);
    const tilem = isTilem(cal);

    if (purnama || tilem) {
      const jenis: JenisHariSuci = purnama ? "purnama" : "tilem";
      if (!opsi.jenis || opsi.jenis === jenis) {
        hasil.push({
          date: new Date(cursor),
          jenis,
          nama: purnama ? "Purnama" : "Tilem",
          noSasih: saka.noSasih,
          penanggal: saka.penanggal,
          isPangelong: saka.isPangelong,
        });
        if (opsi.limit && hasil.length >= opsi.limit) break;
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return hasil;
}

export function purnamaDalamTahun(year: number): HariSuci[] {
  const mulai = new Date(year, 0, 1);
  const akhir = new Date(year, 11, 31);
  return cariPurnamaTilem(mulai, akhir, { jenis: "purnama" });
}

export function tilemDalamTahun(year: number): HariSuci[] {
  const mulai = new Date(year, 0, 1);
  const akhir = new Date(year, 11, 31);
  return cariPurnamaTilem(mulai, akhir, { jenis: "tilem" });
}

export function purnamaTilemDalamTahun(year: number): HariSuci[] {
  const mulai = new Date(year, 0, 1);
  const akhir = new Date(year, 11, 31);
  return cariPurnamaTilem(mulai, akhir);
}

export function hariSuciBerikutnya(fromDate: Date): HariSuci | null {
  const mulai = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const akhir = new Date(mulai);
  akhir.setDate(akhir.getDate() + 370);
  const hasil = cariPurnamaTilem(mulai, akhir, { limit: 1 });
  return hasil[0] ?? null;
}

export function isPurnamaAtauTilem(date: Date): JenisHariSuci | null {
  const cal = new SakaCalendar(date);
  if (isPurnama(cal)) return "purnama";
  if (isTilem(cal)) return "tilem";
  return null;
}
