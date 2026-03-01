// ============================================================
// easterEngine.ts — Engine hari raya Kristen berbasis Easter
//
// Algoritma: Meeus/Jones/Butcher (Anonymous Gregorian Algorithm)
// Akurat untuk tahun 1583–4099.
//
// Hari raya:
//   Jumat Agung       = Easter - 2 hari
//   Paskah            = Easter Sunday
//   Kenaikan Yesus    = Easter + 39 hari
// ============================================================

import type { HariLibur, InfoEaster } from "./types";

// ---------------------------------------------------------------------------
// Core: hitung tanggal Easter Sunday untuk tahun Gregorian
// Algoritma Meeus/Jones/Butcher — tidak ada tabel, murni matematika
// ---------------------------------------------------------------------------

/**
 * Hitung tanggal Easter Sunday untuk tahun Gregorian tertentu.
 * Menggunakan algoritma Meeus/Jones/Butcher.
 *
 * @param tahun  Tahun Masehi (≥ 1583)
 * @returns      Date object untuk Easter Sunday
 */
export function hitungEaster(tahun: number): Date {
  const a = tahun % 19;
  const b = Math.floor(tahun / 100);
  const c = tahun % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const bulan = Math.floor((h + l - 7 * m + 114) / 31); // 3=Maret, 4=April
  const hari = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(tahun, bulan - 1, hari);
}

/**
 * Tambah sejumlah hari ke Date, kembalikan Date baru.
 */
function tambahHari(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ---------------------------------------------------------------------------
// Info lengkap Easter + turunannya
// ---------------------------------------------------------------------------

/**
 * Hitung semua tanggal hari raya Kristen untuk tahun tertentu.
 */
export function getInfoEaster(tahun: number): InfoEaster {
  const easter = hitungEaster(tahun);
  return {
    tahun,
    tanggalEaster: easter,
    jumatAgung: tambahHari(easter, -2),
    kenaikanYesus: tambahHari(easter, 39),
  };
}

// ---------------------------------------------------------------------------
// Kembalikan sebagai HariLibur[]
// ---------------------------------------------------------------------------

/**
 * Kembalikan daftar hari libur Kristen untuk tahun tertentu.
 */
export function getLiburKristen(tahun: number): HariLibur[] {
  const info = getInfoEaster(tahun);

  return [
    {
      tanggal: info.jumatAgung,
      nama: "Jumat Agung",
      kategori: "kristen",
      jenis: "libur",
      keterangan: `Easter ${info.tanggalEaster.toLocaleDateString("id-ID")}`,
    },
    {
      tanggal: info.tanggalEaster,
      nama: "Hari Raya Paskah",
      kategori: "kristen",
      jenis: "libur",
    },
    {
      tanggal: info.kenaikanYesus,
      nama: "Kenaikan Yesus Kristus",
      kategori: "kristen",
      jenis: "libur",
      keterangan: "Easter + 39 hari",
    },
  ];
}
