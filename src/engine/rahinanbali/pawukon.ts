// ============================================================
// pawukon.ts — Perhitungan Pawukon (Wuku, Saptawara, Pancawara, dll.)
// ============================================================

import type { WukuInfo, SaptawaraInfo, PancawaraInfo } from "./types";
import type { SakaCalendarPivot } from "./types";
import { getDateDiffDays } from "./utils";

// ---------------------------------------------------------------------------
// Wuku
// ---------------------------------------------------------------------------

/** Urip/neptu tiap wuku (index = noWuku - 1) */
const URIP_WUKU_TABLE: number[] = [
  7, 1, 4, 6, 5, 8, 9, 3, 7, 1, // 1–10
  4, 6, 5, 8, 9, 3, 7, 1, 4, 6, // 11–20
  5, 8, 9, 3, 7, 1, 4, 6, 5, 8, // 21–30
];

/**
 * Menghitung informasi Wuku berdasarkan timestamp target dan pivot.
 */
export function getWuku(timestampMs: number, pivot: SakaCalendarPivot): WukuInfo {
  const bedaHari = getDateDiffDays(pivot.timestampMs, timestampMs);

  let angkaWuku = (pivot.angkaWuku + bedaHari) % 210;
  if (angkaWuku < 0) {
    angkaWuku = 210 - (-(pivot.angkaWuku + bedaHari) % 210);
  }
  if (angkaWuku === 0) angkaWuku = 210;

  let noWuku = Math.ceil(angkaWuku / 7);
  if (noWuku > 30) noWuku %= 30;
  if (noWuku === 0) noWuku = 30;

  const uripWuku = URIP_WUKU_TABLE[noWuku - 1] ?? 0;

  return { noWuku, angkaWuku, uripWuku };
}

// ---------------------------------------------------------------------------
// Saptawara
// ---------------------------------------------------------------------------

/** DAY_OF_WEEK JS (0=Sun … 6=Sat) → { noSaptawara, uripSaptawara } */
const SAPTAWARA_TABLE: { no: number; urip: number }[] = [
  { no: 0, urip: 5 }, // Minggu  → Redite
  { no: 1, urip: 4 }, // Senin   → Soma
  { no: 2, urip: 3 }, // Selasa  → Anggara
  { no: 3, urip: 7 }, // Rabu    → Buda
  { no: 4, urip: 8 }, // Kamis   → Wrhaspati
  { no: 5, urip: 6 }, // Jumat   → Sukra
  { no: 6, urip: 9 }, // Sabtu   → Saniscara
];

export function getSaptawara(date: Date): SaptawaraInfo {
  const entry = SAPTAWARA_TABLE[date.getDay()];
  if (!entry) throw new Error("Invalid day of week");
  return { noSaptawara: entry.no, uripSaptawara: entry.urip };
}

// ---------------------------------------------------------------------------
// Pancawara
// ---------------------------------------------------------------------------

/** urip per noPancawara (index = noPancawara - 1) */
const URIP_PANCAWARA_TABLE = [5, 9, 7, 4, 8];

export function getPancawara(angkaWuku: number): PancawaraInfo {
  const noPancawara = (angkaWuku % 5) + 1;
  const uripPancawara = URIP_PANCAWARA_TABLE[noPancawara - 1] ?? 5;
  return { noPancawara, uripPancawara };
}

// ---------------------------------------------------------------------------
// Triwara
// ---------------------------------------------------------------------------

/** 1=Pasah, 2=Beteng, 3=Kajeng */
export function getTriwara(angkaWuku: number): number {
  const r = angkaWuku % 3;
  return r === 0 ? 3 : r;
}

// ---------------------------------------------------------------------------
// Ekawara
// ---------------------------------------------------------------------------

/** 1=Luang, 0=bukan Luang */
export function getEkawara(uripPancawara: number, uripSaptawara: number): number {
  return (uripPancawara + uripSaptawara) % 2 !== 0 ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Dwiwara
// ---------------------------------------------------------------------------

/** 1=Menga, 2=Pepet */
export function getDwiwara(uripPancawara: number, uripSaptawara: number): number {
  return (uripPancawara + uripSaptawara) % 2 === 0 ? 1 : 2;
}

// ---------------------------------------------------------------------------
// Caturwara
// ---------------------------------------------------------------------------

/** 1=Sri, 2=Laba, 3=Jaya, 4=Mandala */
export function getCaturwara(angkaWuku: number): number {
  let v: number;
  if (angkaWuku === 71 || angkaWuku === 72 || angkaWuku === 73) {
    v = 3;
  } else if (angkaWuku <= 70) {
    v = angkaWuku % 4;
  } else {
    v = (angkaWuku + 2) % 4;
  }
  return v === 0 ? 4 : v;
}

// ---------------------------------------------------------------------------
// Sadwara
// ---------------------------------------------------------------------------

/** 1=Tungleh, 2=Aryang, 3=Wurukung, 4=Paniron, 5=Was, 6=Maulu */
export function getSadwara(angkaWuku: number): number {
  const r = angkaWuku % 6;
  return r === 0 ? 6 : r;
}

// ---------------------------------------------------------------------------
// Astawara
// ---------------------------------------------------------------------------

/** 1=Sri … 8=Uma */
export function getAstawara(angkaWuku: number): number {
  let v: number;
  if (angkaWuku === 71 || angkaWuku === 72 || angkaWuku === 73) {
    v = 7;
  } else if (angkaWuku <= 70) {
    v = angkaWuku % 8;
  } else {
    v = (angkaWuku + 6) % 8;
  }
  return v === 0 ? 8 : v;
}

// ---------------------------------------------------------------------------
// Sangawara
// ---------------------------------------------------------------------------

/** 1=Dangu … 9=Dadi */
export function getSangawara(angkaWuku: number): number {
  if (angkaWuku <= 4) return 1;
  const r = (angkaWuku + 6) % 9;
  return r === 0 ? 9 : r;
}

// ---------------------------------------------------------------------------
// Dasawara
// ---------------------------------------------------------------------------

/** 1=Pandita … 10=Raksasa */
export function getDasawara(uripPancawara: number, uripSaptawara: number): number {
  return ((uripPancawara + uripSaptawara) % 10) + 1;
}

// ---------------------------------------------------------------------------
// Ingkel
// ---------------------------------------------------------------------------

/** 1=Wong, 2=Sato, 3=Mina, 4=Manuk, 5=Taru, 6=Buku */
export function getIngkel(noWuku: number): number {
  const mod = noWuku % 6;
  return mod === 0 ? 6 : mod;
}

// ---------------------------------------------------------------------------
// Jejepan
// ---------------------------------------------------------------------------

/** 1=Mina, 2=Taru, 3=Sato, 4=Patra, 5=Wong, 6=Paksi */
export function getJejepan(angkaWuku: number): number {
  const r = angkaWuku % 6;
  return r === 0 ? 6 : r;
}

// ---------------------------------------------------------------------------
// Watek Alit (Pewatekan Catur)
// ---------------------------------------------------------------------------

/** 1=Uler, 2=Gajah, 3=Lembu, 4=Lintah */
export function getWatekAlit(uripPancawara: number, uripSaptawara: number): number {
  const r = (uripPancawara + uripSaptawara) % 4;
  return r === 0 ? 4 : r;
}

// ---------------------------------------------------------------------------
// Watek Madya (Pewatekan Panca)
// ---------------------------------------------------------------------------

/** 1=Gajah, 2=Watu, 3=Buta, 4=Suku, 5=Wong */
export function getWatekMadya(uripPancawara: number, uripSaptawara: number): number {
  const r = (uripPancawara + uripSaptawara) % 5;
  return r === 0 ? 5 : r;
}
