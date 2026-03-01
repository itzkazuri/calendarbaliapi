// ============================================================
// HijriahEngine.ts — Engine kalender Hijriah (Islam)
// Menggunakan kalender Hijriah tabular (civil) untuk konversi.
// Catatan: untuk keputusan resmi (rukyat), bisa ada selisih 1 hari.
// ============================================================

import type { HariLibur, NamaBulanHijriah, TanggalHijriah } from "./types";

// ---------------------------------------------------------------------------
// Konstanta & util
// ---------------------------------------------------------------------------

export const NAMA_BULAN_HIJRIAH: NamaBulanHijriah[] = [
  "Muharram",
  "Safar",
  "Rabi'ul Awal",
  "Rabi'ul Akhir",
  "Jumadil Awal",
  "Jumadil Akhir",
  "Rajab",
  "Sya'ban",
  "Ramadhan",
  "Syawal",
  "Dzulqa'dah",
  "Dzulhijjah",
];

const ISLAMIC_EPOCH_JDN = 1948440; // JDN untuk 1 Muharram 1 AH

function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function jdnToGregorian(jdn: number): { year: number; month: number; day: number } {
  let l = jdn + 68569;
  const n = Math.floor((4 * l) / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l) / 2447);
  const day = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  const month = j + 2 - 12 * l;
  const year = 100 * (n - 49) + i + l;
  return { year, month, day };
}

function hijriToJdn(tahun: number, bulan: number, hari: number): number {
  const days =
    hari +
    Math.ceil(29.5 * (bulan - 1)) +
    (tahun - 1) * 354 +
    Math.floor((3 + 11 * tahun) / 30);
  return days + ISLAMIC_EPOCH_JDN - 1;
}

function jdnToHijri(jdn: number): TanggalHijriah {
  let days = jdn - ISLAMIC_EPOCH_JDN + 10632;
  const n = Math.floor((days - 1) / 10631);
  days = days - 10631 * n + 354;
  const j =
    Math.floor((10985 - days) / 5316) * Math.floor((50 * days) / 17719) +
    Math.floor(days / 5670) * Math.floor((43 * days) / 15238);
  days =
    days -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const bulan = Math.floor((24 * days) / 709);
  const hari = days - Math.floor((709 * bulan) / 24);
  const tahun = 30 * n + j - 30;
  return { tahun, bulan, hari };
}

// ---------------------------------------------------------------------------
// API publik
// ---------------------------------------------------------------------------

/** Konversi tanggal Hijriah ke Gregorian */
export function hijriToGregorian(tahun: number, bulan: number, hari: number): Date {
  const jdn = hijriToJdn(tahun, bulan, hari);
  const g = jdnToGregorian(jdn);
  return new Date(g.year, g.month - 1, g.day);
}

/** Konversi tanggal Gregorian ke Hijriah */
export function gregorianToHijri(date: Date): TanggalHijriah {
  const jdn = gregorianToJdn(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
  return jdnToHijri(jdn);
}

/** Format sederhana tanggal Hijriah */
export function formatHijriah(tgl: TanggalHijriah): string {
  const nama = NAMA_BULAN_HIJRIAH[tgl.bulan - 1];
  return `${tgl.hari} ${nama} ${tgl.tahun} H`;
}

/** Hari raya Islam yang dihitung dari kalender Hijriah (tabular) */
export function getLiburIslam(tahunGregorian: number, adjustment = 0): HariLibur[] {
  const jan1 = new Date(tahunGregorian, 0, 1);
  const dec31 = new Date(tahunGregorian, 11, 31);
  const hijriStart = gregorianToHijri(jan1).tahun;
  const hijriEnd = gregorianToHijri(dec31).tahun;

  const targetHijriYears = new Set<number>();
  for (let y = hijriStart - 1; y <= hijriEnd + 1; y += 1) {
    targetHijriYears.add(y);
  }

  const definisi = [
    { bulan: 1, hari: 1, nama: "Tahun Baru Islam" }, // 1 Muharram
    { bulan: 7, hari: 27, nama: "Isra Mi'raj" }, // 27 Rajab
    { bulan: 3, hari: 12, nama: "Maulid Nabi Muhammad SAW" }, // 12 Rabi'ul Awal
    { bulan: 10, hari: 1, nama: "Hari Raya Idul Fitri" }, // 1 Syawal
    { bulan: 12, hari: 10, nama: "Hari Raya Idul Adha" }, // 10 Dzulhijjah
  ];

  const hasil: HariLibur[] = [];

  for (const tahunHijri of targetHijriYears) {
    for (const def of definisi) {
      const tanggal = hijriToGregorian(tahunHijri, def.bulan, def.hari);
      if (adjustment !== 0) {
        tanggal.setDate(tanggal.getDate() + adjustment);
      }
      if (tanggal.getFullYear() === tahunGregorian) {
        hasil.push({
          tanggal,
          nama: def.nama,
          kategori: "islam",
          jenis: "libur",
          keterangan: "Perhitungan Hijriah tabular",
        });
      }
    }
  }

  return hasil;
}
