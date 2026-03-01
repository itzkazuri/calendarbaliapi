// ============================================================
// types.ts — Shared types & enums for Kalender Bali
// ============================================================

export interface SakaCalendarPivot {
  timestampMs: number;
  noWuku: number;
  angkaWuku: number;
  tahunSaka: number;
  noSasih: number;
  penanggal: number;
  isPangelong: boolean;
  noNgunaratri: number;
  isNgunaratri: boolean;
}

export interface SakaDate {
  tahunSaka: number;
  penanggal: number;
  noSasih: number;
  noNgunaratri: number;
  isNgunaratri: boolean;
  isPangelong: boolean;
  isNampih: boolean;
}

export interface WukuInfo {
  noWuku: number;
  angkaWuku: number;
  uripWuku: number;
}

export interface SaptawaraInfo {
  noSaptawara: number;
  uripSaptawara: number;
}

export interface PancawaraInfo {
  noPancawara: number;
  uripPancawara: number;
}

// Field selector enums
export const NO_WUKU    = 0 as const;
export const ANGKA_WUKU = 1 as const;
export const URIP_WUKU  = 2 as const;

export const NO_SAPTAWARA   = 0 as const;
export const URIP_SAPTAWARA = 1 as const;

export const NO_PANCAWARA   = 0 as const;
export const URIP_PANCAWARA = 1 as const;

export const TAHUN_SAKA    = 0 as const;
export const PENANGGAL     = 1 as const;
export const NO_SASIH      = 2 as const;
export const NO_NGUNARATRI = 3 as const;

export const IS_NGUNARATRI = 0 as const;
export const IS_PANGELONG  = 1 as const;
export const IS_NAMPIH     = 2 as const;
