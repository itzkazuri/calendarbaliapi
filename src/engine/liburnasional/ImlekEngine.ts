// ============================================================
// imlekEngine.ts — Engine Tahun Baru Imlek & Kalender Tionghoa
//
// Sistem Tionghoa adalah Lunisolar: bulan mengikuti lunar,
// tahun disesuaikan dengan solar via bulan intercalary.
//
// Chinese New Year = New Moon ke-2 setelah Winter Solstice (21 Des),
// yang berarti jatuh antara 21 Januari – 20 Februari.
//
// Engine ini menggunakan:
//   1. Tabel tanggal Imlek astronomis (1900–2100) untuk akurasi tinggi
//   2. Algoritma Shio: (tahun - 4) % 12
//   3. Algoritma Elemen: (tahun - 4) % 10 → 5 elemen × 2 (Yin/Yang)
//   4. Siklus Ganzhi 60 tahun (10 Batang Surgawi × 12 Cabang Bumi)
//
// Imlek juga memiliki sistem mitologi/kosmologi:
//   - 12 Shio (hewan)
//   - 5 Elemen (Wu Xing): Kayu, Api, Tanah, Logam, Air
//   - Polaritas: Yin / Yang
//   - Batang Surgawi (Tiangan): 10 siklus
//   - Cabang Bumi (Dizhi): 12 siklus
// ============================================================

import type { HariLibur, InfoImlek, NamaShio, NamaElemen } from "./types";

// ---------------------------------------------------------------------------
// Data Shio & Elemen
// ---------------------------------------------------------------------------

export const DAFTAR_SHIO: NamaShio[] = [
  "Tikus",
  "Kerbau",
  "Macan",
  "Kelinci",
  "Naga",
  "Ular",
  "Kuda",
  "Kambing",
  "Monyet",
  "Ayam",
  "Anjing",
  "Babi",
];

export const DAFTAR_ELEMEN: NamaElemen[] = [
  "Kayu",
  "Api",
  "Tanah",
  "Logam",
  "Air",
];

/** Batang Surgawi (Tiangan) — 10 siklus */
export const TIANGAN = [
  "Jiǎ (甲)",
  "Yǐ (乙)",
  "Bǐng (丙)",
  "Dīng (丁)",
  "Wù (戊)",
  "Jǐ (己)",
  "Gēng (庚)",
  "Xīn (辛)",
  "Rén (壬)",
  "Guǐ (癸)",
];

/** Cabang Bumi (Dizhi) — 12 siklus, berkorespondensi dengan Shio */
export const DIZHI = [
  "Zǐ (子/Tikus)",
  "Chǒu (丑/Kerbau)",
  "Yín (寅/Macan)",
  "Mǎo (卯/Kelinci)",
  "Chén (辰/Naga)",
  "Sì (巳/Ular)",
  "Wǔ (午/Kuda)",
  "Wèi (未/Kambing)",
  "Shēn (申/Monyet)",
  "Yǒu (酉/Ayam)",
  "Xū (戌/Anjing)",
  "Hài (亥/Babi)",
];

/** Karakteristik setiap shio */
export const KARAKTER_SHIO: Record<NamaShio, string> = {
  Tikus: "Cerdas, adaptif, oportunistik, bersemangat",
  Kerbau: "Tekun, dapat diandalkan, kuat, keras kepala",
  Macan: "Berani, kompetitif, tidak terduga, percaya diri",
  Kelinci: "Tenang, elegan, baik hati, pengasih",
  Naga: "Percaya diri, ambisius, karismatik, sempurna",
  Ular: "Bijaksana, misterius, intuitif, anggun",
  Kuda: "Energik, mandiri, aktif, petualang",
  Kambing: "Tenang, lembut, kreatif, empati",
  Monyet: "Cerdik, playful, ingin tahu, fleksibel",
  Ayam: "Observatif, pekerja keras, berani, jujur",
  Anjing: "Setia, jujur, cerdas, intuitif",
  Babi: "Murah hati, bertanggung jawab, damai, optimis",
};

/** Karakteristik elemen */
export const KARAKTER_ELEMEN: Record<NamaElemen, string> = {
  Kayu: "Pertumbuhan, kreativitas, kelenturan, kebaikan",
  Api: "Semangat, dinamis, pemimpin, transformasi",
  Tanah: "Stabilitas, dapat diandalkan, sabar, netral",
  Logam: "Kekuatan, tekad, ambisi, disiplin",
  Air: "Kebijaksanaan, fleksibilitas, intuisi, komunikasi",
};

// ---------------------------------------------------------------------------
// Tabel tanggal Imlek (Chinese New Year) — 1924–2100
// Format: [tahun Masehi, bulan (1-12), hari]
// Sumber: Kalkulasi astronomis New Moon ke-2 setelah Winter Solstice
// ---------------------------------------------------------------------------

type TabelImlek = [number, number, number]; // [tahun, bulan, hari]

const TABEL_IMLEK: TabelImlek[] = [
  [1924, 2, 5],
  [1925, 1, 24],
  [1926, 2, 13],
  [1927, 2, 2],
  [1928, 1, 23],
  [1929, 2, 10],
  [1930, 1, 30],
  [1931, 2, 17],
  [1932, 2, 6],
  [1933, 1, 26],
  [1934, 2, 14],
  [1935, 2, 4],
  [1936, 1, 24],
  [1937, 2, 11],
  [1938, 1, 31],
  [1939, 2, 19],
  [1940, 2, 8],
  [1941, 1, 27],
  [1942, 2, 15],
  [1943, 2, 5],
  [1944, 1, 25],
  [1945, 2, 13],
  [1946, 2, 2],
  [1947, 1, 22],
  [1948, 2, 10],
  [1949, 1, 29],
  [1950, 2, 17],
  [1951, 2, 6],
  [1952, 1, 27],
  [1953, 2, 14],
  [1954, 2, 3],
  [1955, 1, 24],
  [1956, 2, 12],
  [1957, 1, 31],
  [1958, 2, 18],
  [1959, 2, 8],
  [1960, 1, 28],
  [1961, 2, 15],
  [1962, 2, 5],
  [1963, 1, 25],
  [1964, 2, 13],
  [1965, 2, 2],
  [1966, 1, 21],
  [1967, 2, 9],
  [1968, 1, 30],
  [1969, 2, 17],
  [1970, 2, 6],
  [1971, 1, 27],
  [1972, 2, 15],
  [1973, 2, 3],
  [1974, 1, 23],
  [1975, 2, 11],
  [1976, 1, 31],
  [1977, 2, 18],
  [1978, 2, 7],
  [1979, 1, 28],
  [1980, 2, 16],
  [1981, 2, 5],
  [1982, 1, 25],
  [1983, 2, 13],
  [1984, 2, 2],
  [1985, 2, 20],
  [1986, 2, 9],
  [1987, 1, 29],
  [1988, 2, 17],
  [1989, 2, 6],
  [1990, 1, 27],
  [1991, 2, 15],
  [1992, 2, 4],
  [1993, 1, 23],
  [1994, 2, 10],
  [1995, 1, 31],
  [1996, 2, 19],
  [1997, 2, 7],
  [1998, 1, 28],
  [1999, 2, 16],
  [2000, 2, 5],
  [2001, 1, 24],
  [2002, 2, 12],
  [2003, 2, 1],
  [2004, 1, 22],
  [2005, 2, 9],
  [2006, 1, 29],
  [2007, 2, 18],
  [2008, 2, 7],
  [2009, 1, 26],
  [2010, 2, 14],
  [2011, 2, 3],
  [2012, 1, 23],
  [2013, 2, 10],
  [2014, 1, 31],
  [2015, 2, 19],
  [2016, 2, 8],
  [2017, 1, 28],
  [2018, 2, 16],
  [2019, 2, 5],
  [2020, 1, 25],
  [2021, 2, 12],
  [2022, 2, 1],
  [2023, 1, 22],
  [2024, 2, 10],
  [2025, 1, 29],
  [2026, 2, 17],
  [2027, 2, 6],
  [2028, 1, 26],
  [2029, 2, 13],
  [2030, 2, 3],
  [2031, 1, 23],
  [2032, 2, 11],
  [2033, 1, 31],
  [2034, 2, 19],
  [2035, 2, 8],
  [2036, 1, 28],
  [2037, 2, 15],
  [2038, 2, 4],
  [2039, 1, 24],
  [2040, 2, 12],
  [2041, 2, 1],
  [2042, 1, 22],
  [2043, 2, 10],
  [2044, 1, 30],
  [2045, 2, 17],
  [2046, 2, 6],
  [2047, 1, 26],
  [2048, 2, 14],
  [2049, 2, 2],
  [2050, 1, 23],
];

/** Map tahunMasehi → [bulan, hari] untuk lookup cepat */
const MAP_IMLEK = new Map<number, [number, number]>(
  TABEL_IMLEK.map(([y, m, d]) => [y, [m, d]]),
);

// ---------------------------------------------------------------------------
// Algoritma Shio & Elemen
// ---------------------------------------------------------------------------

/**
 * Hitung shio berdasarkan tahun Masehi (saat Imlek mulai tahun tersebut).
 * Formula: (tahun - 4) % 12
 * Ref: Tikus = 2020, 2008, 1996 → index 0
 */
export function getShio(tahunMasehi: number): NamaShio {
  const idx = (((tahunMasehi - 4) % 12) + 12) % 12;
  return DAFTAR_SHIO[idx];
}

/**
 * Hitung elemen berdasarkan tahun Masehi.
 * Formula: Math.floor(((tahun - 4) % 10) / 2)
 * Setiap elemen berlangsung 2 tahun (1 Yin, 1 Yang).
 */
export function getElemen(tahunMasehi: number): NamaElemen {
  const idx = Math.floor(((((tahunMasehi - 4) % 10) + 10) % 10) / 2);
  return DAFTAR_ELEMEN[idx];
}

/**
 * Polaritas: tahun genap = Yang, ganjil = Yin.
 * (Berlaku untuk tahun Tionghoa, bukan Masehi — tapi karena Tahun Tionghoa
 * ≈ Tahun Masehi + 2637, paritasnya sama)
 */
export function getPolaritas(tahunMasehi: number): "Yin" | "Yang" {
  return tahunMasehi % 2 === 0 ? "Yang" : "Yin";
}

/**
 * Tahun Tionghoa (tahun lunisolar) berdasarkan tahun Masehi.
 * Imlek dimulai ~4 Februari, sehingga di bulan Jan-Feb perlu dikurangi 1.
 * Namun untuk atribusi shio/elemen, kita gunakan tahun saat Imlek mulai.
 */
export function getTahunTionghoa(tahunMasehi: number): number {
  return tahunMasehi + 2637;
}

/**
 * Batang Surgawi (Tiangan) untuk tahun ini.
 */
export function getTiangan(tahunMasehi: number): string {
  const idx = (((tahunMasehi - 4) % 10) + 10) % 10;
  return TIANGAN[idx];
}

/**
 * Cabang Bumi (Dizhi) untuk tahun ini.
 */
export function getDizhi(tahunMasehi: number): string {
  const idx = (((tahunMasehi - 4) % 12) + 12) % 12;
  return DIZHI[idx];
}

// ---------------------------------------------------------------------------
// Tanggal Imlek dari tabel
// ---------------------------------------------------------------------------

/**
 * Dapatkan tanggal Tahun Baru Imlek untuk tahun Masehi tertentu.
 * Menggunakan tabel astronomis untuk akurasi tinggi.
 * Fallback ke estimasi jika di luar rentang tabel.
 *
 * @param tahunMasehi  Tahun Masehi (1924–2050 dari tabel)
 */
export function getTanggalImlek(tahunMasehi: number): Date {
  const entry = MAP_IMLEK.get(tahunMasehi);
  if (entry) {
    return new Date(tahunMasehi, entry[0] - 1, entry[1]);
  }

  // Fallback estimasi untuk tahun di luar tabel
  // Imlek ≈ 29.53059 hari × banyak bulan setelah epoch
  // Estimasi kasar: rata-rata 365.25/12.3683 ≈ 29.5306 hari per bulan
  console.warn(
    `Tahun ${tahunMasehi} di luar tabel Imlek (1924–2050). Menggunakan estimasi.`,
  );
  // Perkiraan berdasarkan pola: setiap tahun mundur ~10-11 hari, tiap 3 tahun maju ~19 hari
  const ref = MAP_IMLEK.get(2025)!; // 29 Jan 2025
  const deltaT = tahunMasehi - 2025;
  const hariPerTahunLunar = 354.367;
  const estimasiMs =
    new Date(2025, ref[0] - 1, ref[1]).getTime() +
    deltaT * hariPerTahunLunar * 86400000;
  return new Date(estimasiMs);
}

// ---------------------------------------------------------------------------
// Info lengkap Imlek
// ---------------------------------------------------------------------------

/**
 * Dapatkan informasi lengkap Tahun Baru Imlek untuk tahun Masehi tertentu.
 */
export function getInfoImlek(tahunMasehi: number): InfoImlek {
  const shio = getShio(tahunMasehi);
  const elemen = getElemen(tahunMasehi);
  const tanggal = getTanggalImlek(tahunMasehi);

  return {
    tahunTionghoa: getTahunTionghoa(tahunMasehi),
    shio,
    elemen,
    polaritas: getPolaritas(tahunMasehi),
    tanggalMasehi: tanggal,
  };
}

// ---------------------------------------------------------------------------
// HariLibur[]
// ---------------------------------------------------------------------------

/**
 * Kembalikan hari libur Imlek yang jatuh dalam tahun Masehi tertentu.
 * Imlek bisa jatuh di Januari atau Februari.
 */
export function getLiburImlek(tahunMasehi: number): HariLibur[] {
  const hasil: HariLibur[] = [];

  // Cek Imlek yang mulai di tahun ini (bisa Jan atau Feb)
  const info = getInfoImlek(tahunMasehi);
  if (info.tanggalMasehi.getFullYear() === tahunMasehi) {
    hasil.push({
      tanggal: info.tanggalMasehi,
      nama: "Tahun Baru Imlek",
      kategori: "imlek",
      jenis: "libur",
      keterangan: `Tahun ${info.tahunTionghoa} — Shio ${info.shio} ${info.elemen} (${info.polaritas}) | ${getTiangan(tahunMasehi)}-${getDizhi(tahunMasehi)}`,
    });
  }

  return hasil;
}
