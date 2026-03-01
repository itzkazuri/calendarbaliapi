// ============================================================
// pivot.ts — Menentukan tanggal pivot untuk kalender Saka
// ============================================================

import type { SakaCalendarPivot } from "./types";

/**
 * Mengembalikan pivot yang sesuai berdasarkan timestamp (ms) yang diberikan.
 *
 * Terdapat dua sistem pengalantaka:
 * - Setelah 1 Januari 2000  → Eka Sungsang ke Pahing
 * - Sebelum 1 Januari 2000  → Eka Sungsang ke Pon
 */
export function getPivot(timestampMs: number): SakaCalendarPivot {
  // Offset zona waktu lokal (ms)
  const zoneOffsetMs = new Date().getTimezoneOffset() * -60 * 1000;

  // 2000-01-01 00:00:00 UTC dalam ms
  const Y2K = 946684800 * 1000;

  if (timestampMs >= Y2K - zoneOffsetMs) {
    // Setelah 30 Desember 1999 — Pengalantaka Eka Sungsang ke Pahing
    return {
      timestampMs: Y2K - zoneOffsetMs,
      noWuku: 10,
      angkaWuku: 70,
      tahunSaka: 1921,
      noSasih: 7,
      penanggal: 10,
      isPangelong: true,
      noNgunaratri: 424,
      isNgunaratri: false,
    };
  } else {
    // Sebelum 2000 — Pengalantaka Eka Sungsang ke Pon
    return {
      timestampMs: 0 - zoneOffsetMs, // 1970-01-01
      noWuku: 5,
      angkaWuku: 33,
      tahunSaka: 1891,
      noSasih: 7,
      penanggal: 8,
      isPangelong: true,
      noNgunaratri: 50,
      isNgunaratri: false,
    };
  }
}
