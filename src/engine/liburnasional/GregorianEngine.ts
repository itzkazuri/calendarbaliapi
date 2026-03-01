// ============================================================
// gregorianEngine.ts — Hari libur dengan tanggal tetap (fixed)
// Tidak butuh algoritma — cukup set bulan & hari.
// ============================================================

import type { HariLibur } from "./types";

/** Definisi hari libur Gregorian: bulan (1–12) dan hari (1–31) */
interface DefLiburGregorian {
  bulan: number;
  hari: number;
  nama: string;
  isLibur: boolean; // false = cuti bersama
}

const DAFTAR_LIBUR_GREGORIAN: DefLiburGregorian[] = [
  { bulan: 1, hari: 1, nama: "Tahun Baru Masehi", isLibur: true },
  { bulan: 5, hari: 1, nama: "Hari Buruh Internasional", isLibur: true },
  { bulan: 6, hari: 1, nama: "Hari Lahir Pancasila", isLibur: true },
  {
    bulan: 8,
    hari: 17,
    nama: "Hari Kemerdekaan Republik Indonesia",
    isLibur: true,
  },
  { bulan: 12, hari: 25, nama: "Hari Natal", isLibur: true },
];

/**
 * Kembalikan semua hari libur Gregorian (tanggal tetap) untuk tahun tertentu.
 */
export function getLiburGregorian(tahun: number): HariLibur[] {
  return DAFTAR_LIBUR_GREGORIAN.map(
    (def) =>
      ({
        tanggal: new Date(tahun, def.bulan - 1, def.hari),
        nama: def.nama,
        kategori: def.isLibur ? "nasional" : "cuti_bersama",
        jenis: def.isLibur ? "libur" : "cuti_bersama",
      }) as HariLibur,
  );
}
