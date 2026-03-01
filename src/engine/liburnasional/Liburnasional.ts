// ============================================================
// LiburNasional.ts — Facade utama: agregasi semua engine
//
// Satu titik masuk untuk mendapatkan semua hari libur nasional
// Indonesia, dari semua engine (Gregorian, Kristen, Islam,
// Imlek, Waisak, Cuti Bersama).
// ============================================================

import type { HariLibur, OpsiLiburNasional, KategoriLibur } from "./types";
import { getLiburGregorian } from "./GregorianEngine";
import { getLiburKristen } from "./EasterEngine";
import { getLiburIslam } from "./HijriahEngine";
import { getLiburImlek } from "./ImlekEngine";
import { getLiburWaisak } from "./WaisakEngine";
import { getCutiBersama } from "./Cutibersamaengine";

// ---------------------------------------------------------------------------
// Facade utama
// ---------------------------------------------------------------------------

/**
 * Dapatkan semua hari libur nasional Indonesia untuk tahun tertentu.
 *
 * @param tahun  Tahun Masehi
 * @param opsi   Opsi filter dan konfigurasi
 *
 * @example
 * const libur2025 = getLiburNasional(2025);
 * const liburIslam = getLiburNasional(2025, { hanyaKategori: ["islam"] });
 */
export function getLiburNasional(
  tahun: number,
  opsi: OpsiLiburNasional = {},
): HariLibur[] {
  const {
    termasukCutiBersama = true,
    hanyaKategori,
    adjustmentIslam = 0,
  } = opsi;

  const semua: HariLibur[] = [
    ...getLiburGregorian(tahun),
    ...getLiburKristen(tahun),
    ...getLiburIslam(tahun, adjustmentIslam),
    ...getLiburImlek(tahun),
    ...getLiburWaisak(tahun),
    ...(termasukCutiBersama ? getCutiBersama(tahun) : []),
  ];

  // Filter kategori jika diminta
  const filtered = hanyaKategori
    ? semua.filter((h) => hanyaKategori.includes(h.kategori))
    : semua;

  // Sort berdasarkan tanggal
  return filtered.sort((a, b) => a.tanggal.getTime() - b.tanggal.getTime());
}

/**
 * Cek apakah suatu tanggal adalah hari libur nasional.
 * Mengembalikan info hari libur jika ya, null jika tidak.
 */
export function cekLiburNasional(
  date: Date,
  opsi: OpsiLiburNasional = {},
): HariLibur | null {
  const tahun = date.getFullYear();
  const libur = getLiburNasional(tahun, opsi);
  const target = normalHari(date).getTime();

  return libur.find((h) => normalHari(h.tanggal).getTime() === target) ?? null;
}

/**
 * Cek apakah suatu tanggal adalah hari libur (libur ATAU cuti bersama).
 */
export function isHariLibur(date: Date, opsi: OpsiLiburNasional = {}): boolean {
  return cekLiburNasional(date, opsi) !== null;
}

/**
 * Dapatkan hari libur nasional berikutnya dari tanggal tertentu.
 */
export function liburBerikutnya(
  dari: Date = new Date(),
  opsi: OpsiLiburNasional = {},
): HariLibur | null {
  const target = normalHari(dari).getTime();
  const tahun = dari.getFullYear();

  // Cari di tahun ini dulu, lalu tahun depan jika tidak ada
  for (const t of [tahun, tahun + 1]) {
    const libur = getLiburNasional(t, opsi);
    const found = libur.find((h) => normalHari(h.tanggal).getTime() >= target);
    if (found) return found;
  }

  return null;
}

/**
 * Kelompokkan hari libur berdasarkan kategori.
 */
export function getLiburPerKategori(
  tahun: number,
  opsi: OpsiLiburNasional = {},
): Record<KategoriLibur, HariLibur[]> {
  const semua = getLiburNasional(tahun, opsi);
  const result = {} as Record<KategoriLibur, HariLibur[]>;

  for (const h of semua) {
    if (!result[h.kategori]) result[h.kategori] = [];
    result[h.kategori].push(h);
  }

  return result;
}

/**
 * Hitung jumlah hari kerja dalam rentang (eksklusif akhir pekan + libur nasional).
 */
export function hitungHariKerja(
  mulai: Date,
  akhir: Date,
  opsi: OpsiLiburNasional = {},
): number {
  const tahunMulai = mulai.getFullYear();
  const tahunAkhir = akhir.getFullYear();

  // Cache hari libur per tahun
  const cacheLibur = new Map<number, Set<number>>();
  for (let t = tahunMulai; t <= tahunAkhir; t++) {
    const libur = getLiburNasional(t, opsi);
    cacheLibur.set(
      t,
      new Set(libur.map((h) => normalHari(h.tanggal).getTime())),
    );
  }

  let count = 0;
  const cursor = new Date(normalHari(mulai));

  while (cursor <= akhir) {
    const diOfWeek = cursor.getDay(); // 0=Minggu, 6=Sabtu
    const isWeekend = diOfWeek === 0 || diOfWeek === 6;
    const liburSet = cacheLibur.get(cursor.getFullYear()) ?? new Set();
    const isLibur = liburSet.has(cursor.getTime());

    if (!isWeekend && !isLibur) count++;

    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function normalHari(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
