// ============================================================
// waisakEngine.ts — Engine Hari Raya Waisak (Buddha)
//
// Waisak = peringatan 3 peristiwa Sang Buddha:
//   1. Kelahiran Pangeran Siddharta
//   2. Pencerahan (Bodhi)
//   3. Parinibbana (wafat)
//
// Di Indonesia, Waisak diperingati pada hari purnama (bulan penuh)
// di bulan Waisak/Vesakha (bulan ke-4 atau ke-5 kalender lunar Buddhis),
// yang umumnya jatuh pada purnama di bulan Mei atau awal Juni.
//
// Metode: Tabel astronomis bulan purnama Mei/Juni (akurat)
// Fallback: estimasi berdasarkan pola.
//
// Catatan: Di beberapa tahun, purnama Waisak bisa jatuh di Mei atau Juni.
// Pemerintah Indonesia biasanya menetapkan berdasarkan pengumuman resmi,
// namun secara astronomis kita bisa kalkulasi.
// ============================================================

import type { HariLibur, InfoWaisak } from "./types";

// ---------------------------------------------------------------------------
// Tabel hari Waisak Indonesia (Purnama Waisak) — 1983–2050
// Format: [tahun, bulan (1-12), hari]
// Berdasarkan tanggal yang ditetapkan pemerintah / kalkulasi astronomi
// ---------------------------------------------------------------------------

type TabelWaisak = [number, number, number];

const TABEL_WAISAK: TabelWaisak[] = [
  [1983, 5, 27],
  [1984, 5, 15],
  [1985, 5, 4],
  [1986, 5, 23],
  [1987, 5, 13],
  [1988, 5, 31],
  [1989, 5, 20],
  [1990, 5, 10],
  [1991, 5, 28],
  [1992, 5, 17],
  [1993, 5, 6],
  [1994, 5, 25],
  [1995, 5, 14],
  [1996, 6, 2],
  [1997, 5, 22],
  [1998, 5, 11],
  [1999, 5, 30],
  [2000, 5, 18],
  [2001, 5, 7],
  [2002, 5, 26],
  [2003, 5, 15],
  [2004, 6, 3],
  [2005, 5, 23],
  [2006, 5, 13],
  [2007, 5, 31],
  [2008, 5, 20],
  [2009, 5, 9],
  [2010, 5, 28],
  [2011, 5, 17],
  [2012, 5, 5],
  [2013, 5, 25],
  [2014, 5, 15],
  [2015, 6, 2],
  [2016, 5, 21],
  [2017, 5, 10],
  [2018, 5, 29],
  [2019, 5, 19],
  [2020, 5, 7],
  [2021, 5, 26],
  [2022, 5, 16],
  [2023, 6, 4],
  [2024, 5, 23],
  [2025, 5, 12],
  [2026, 5, 31],
  [2027, 5, 20],
  [2028, 5, 9],
  [2029, 5, 28],
  [2030, 5, 18],
  [2031, 5, 7],
  [2032, 5, 25],
  [2033, 5, 14],
  [2034, 6, 2],
  [2035, 5, 23],
  [2036, 5, 11],
  [2037, 5, 30],
  [2038, 5, 19],
  [2039, 5, 9],
  [2040, 5, 27],
  [2041, 5, 16],
  [2042, 5, 5],
  [2043, 5, 24],
  [2044, 5, 13],
  [2045, 6, 1],
  [2046, 5, 21],
  [2047, 5, 10],
  [2048, 5, 29],
  [2049, 5, 19],
  [2050, 5, 8],
];

const MAP_WAISAK = new Map<number, [number, number]>(
  TABEL_WAISAK.map(([y, m, d]) => [y, [m, d]]),
);

// ---------------------------------------------------------------------------
// Hitung tanggal Waisak
// ---------------------------------------------------------------------------

/**
 * Dapatkan tanggal Waisak untuk tahun Masehi tertentu.
 */
export function getTanggalWaisak(tahunMasehi: number): Date {
  const entry = MAP_WAISAK.get(tahunMasehi);
  if (entry) {
    return new Date(tahunMasehi, entry[0] - 1, entry[1]);
  }

  // Fallback estimasi: Waisak bergeser ~11 hari mundur setiap tahun,
  // lalu maju ~19 hari setiap 3 tahun (pola lunar)
  console.warn(
    `Tahun ${tahunMasehi} di luar tabel Waisak (1983–2050). Menggunakan estimasi.`,
  );
  const ref = MAP_WAISAK.get(2025)!; // 12 Mei 2025
  const deltaT = tahunMasehi - 2025;
  const hariPerTahunLunar = 354.367;
  const estimasiMs =
    new Date(2025, ref[0] - 1, ref[1]).getTime() +
    deltaT * hariPerTahunLunar * 86400000;
  return new Date(estimasiMs);
}

/**
 * Info lengkap Waisak.
 */
export function getInfoWaisak(tahunMasehi: number): InfoWaisak {
  return {
    tahun: tahunMasehi,
    tanggalWaisak: getTanggalWaisak(tahunMasehi),
  };
}

/**
 * Kembalikan hari libur Waisak untuk tahun Masehi tertentu.
 */
export function getLiburWaisak(tahunMasehi: number): HariLibur[] {
  const tgl = getTanggalWaisak(tahunMasehi);

  // Pastikan tanggal masih dalam tahun yang diminta
  if (tgl.getFullYear() !== tahunMasehi) return [];

  return [
    {
      tanggal: tgl,
      nama: "Hari Raya Waisak",
      kategori: "waisak",
      jenis: "libur",
      keterangan: "Purnama Waisak / Vesakha",
    },
  ];
}
