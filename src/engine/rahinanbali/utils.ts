// ============================================================
// utils.ts — Utilitas umum
// ============================================================

/**
 * Menghitung selisih hari (integer) antara dua timestamp dalam ms.
 * Positif jika d2 > d1.
 */
export function getDateDiffDays(d1Ms: number, d2Ms: number): number {
  return Math.trunc((d2Ms - d1Ms) / (1000 * 60 * 60 * 24));
}
