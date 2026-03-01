// ============================================================
// cutiBersamaEngine.ts — Cuti Bersama yang ditetapkan Pemerintah
//
// Cuti bersama TIDAK bisa dihitung secara algoritma — ditetapkan
// oleh Pemerintah Indonesia via SKB 3 Menteri setiap tahun.
// Engine ini menyediakan:
//   1. Data hardcode untuk tahun yang sudah diketahui
//   2. Mekanisme inject/override untuk tahun mendatang
// ============================================================

import type { HariLibur } from "./types";

// ---------------------------------------------------------------------------
// Tipe data
// ---------------------------------------------------------------------------

interface DefCutiBersama {
  bulan: number;
  hari: number;
  nama: string;
}

type DataCutiPerTahun = Record<number, DefCutiBersama[]>;

// ---------------------------------------------------------------------------
// Data cuti bersama yang sudah diketahui
// ---------------------------------------------------------------------------

const DATA_CUTI_BERSAMA: DataCutiPerTahun = {
  2025: [
    { bulan: 1, hari: 16, nama: "Cuti Bersama Isra Mi'raj" }, // Kamis
    { bulan: 2, hari: 16, nama: "Cuti Bersama Tahun Baru Imlek" }, // Minggu (dipindah ke Senin)
    { bulan: 3, hari: 18, nama: "Cuti Bersama Hari Suci Nyepi" },
    { bulan: 3, hari: 20, nama: "Cuti Bersama Lebaran" },
    { bulan: 3, hari: 21, nama: "Cuti Bersama Lebaran" },
    { bulan: 3, hari: 22, nama: "Cuti Bersama Lebaran" },
    { bulan: 3, hari: 24, nama: "Cuti Bersama Lebaran" },
    { bulan: 5, hari: 15, nama: "Cuti Bersama Kenaikan Yesus Kristus" },
    { bulan: 5, hari: 28, nama: "Cuti Bersama Idul Adha" },
    { bulan: 12, hari: 24, nama: "Cuti Bersama Hari Natal" },
    { bulan: 12, hari: 26, nama: "Cuti Bersama Hari Natal" },
  ],
  2026: [
    { bulan: 2, hari: 16, nama: "Cuti Bersama Tahun Baru Imlek" },
    { bulan: 3, hari: 18, nama: "Cuti Bersama Hari Suci Nyepi" },
    { bulan: 3, hari: 20, nama: "Cuti Bersama Lebaran" },
    { bulan: 3, hari: 23, nama: "Cuti Bersama Lebaran" },
    { bulan: 3, hari: 24, nama: "Cuti Bersama Lebaran" },
    { bulan: 5, hari: 15, nama: "Cuti Bersama Kenaikan Yesus Kristus" },
    { bulan: 5, hari: 28, nama: "Cuti Bersama Idul Adha" },
    { bulan: 12, hari: 24, nama: "Cuti Bersama Hari Natal" },
  ],
};

// ---------------------------------------------------------------------------
// Registry untuk inject data dari luar
// ---------------------------------------------------------------------------

/** Store untuk data yang di-inject runtime */
const INJECT_REGISTRY: DataCutiPerTahun = {};

/**
 * Inject / override data cuti bersama untuk tahun tertentu.
 * Gunakan ini untuk tahun yang belum ada datanya, atau untuk
 * meng-override data yang sudah ada.
 *
 * @example
 * injectCutiBersama(2026, [
 *   { bulan: 1, hari: 2, nama: "Cuti Bersama Tahun Baru Masehi" },
 * ]);
 */
export function injectCutiBersama(tahun: number, data: DefCutiBersama[]): void {
  INJECT_REGISTRY[tahun] = data;
}

/**
 * Tambahkan satu entri cuti bersama ke tahun tertentu.
 */
export function tambahCutiBersama(
  tahun: number,
  bulan: number,
  hari: number,
  nama: string,
): void {
  if (!INJECT_REGISTRY[tahun]) {
    INJECT_REGISTRY[tahun] = [];
  }
  INJECT_REGISTRY[tahun].push({ bulan, hari, nama });
}

/**
 * Hapus semua injected data untuk tahun tertentu.
 */
export function resetInjectedCuti(tahun: number): void {
  delete INJECT_REGISTRY[tahun];
}

// ---------------------------------------------------------------------------
// Ambil data
// ---------------------------------------------------------------------------

/**
 * Dapatkan semua cuti bersama untuk tahun tertentu.
 * Data inject akan meng-override data bawaan jika ada.
 */
export function getCutiBersama(tahun: number): HariLibur[] {
  // Inject registry mengoverride data bawaan
  const sumber = INJECT_REGISTRY[tahun] ?? DATA_CUTI_BERSAMA[tahun] ?? [];

  return sumber.map((def) => ({
    tanggal: new Date(tahun, def.bulan - 1, def.hari),
    nama: def.nama,
    kategori: "cuti_bersama" as const,
    jenis: "cuti_bersama" as const,
    keterangan: "Ditetapkan via SKB Menteri",
  }));
}

/**
 * Cek apakah data cuti bersama tersedia untuk tahun tertentu.
 */
export function adaDataCuti(tahun: number): boolean {
  return !!(INJECT_REGISTRY[tahun] ?? DATA_CUTI_BERSAMA[tahun]);
}

/**
 * Daftar tahun yang memiliki data cuti bersama.
 */
export function getTahunTersedia(): number[] {
  const built = Object.keys(DATA_CUTI_BERSAMA).map(Number);
  const injected = Object.keys(INJECT_REGISTRY).map(Number);
  return [...new Set([...built, ...injected])].sort();
}
