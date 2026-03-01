// ============================================================
// dewasa.ts — Perhitungan Eka Jala Rsi, Lintang, Panca Sudha,
//             Pararasan, Rakam, dan Zodiak
// ============================================================

// ---------------------------------------------------------------------------
// Eka Jala Rsi
// ---------------------------------------------------------------------------

/**
 * Tabel EJR[noWuku-1][noSaptawara] → noEkaJalaRsi (1–28)
 */
const EJR_TABLE: number[][] = [
  /* wuku  1 */ [24,  8, 18,  8, 24, 24, 18],
  /* wuku  2 */ [10,  8, 14, 27, 25, 24, 21],
  /* wuku  3 */ [14,  8, 14, 26, 20,  6,  3],
  /* wuku  4 */ [15, 27, 18, 21, 26, 23,  1],
  /* wuku  5 */ [11,  6, 16, 24,  8, 18, 24],
  /* wuku  6 */ [18, 26,  5, 24,  3,  3,  3],
  /* wuku  7 */ [13, 13,  5, 15, 13, 27, 27],
  /* wuku  8 */ [ 2, 24, 24, 16, 26, 16,  6],
  /* wuku  9 */ [10, 26, 19, 26, 12, 16, 22],
  /* wuku 10 */ [26, 26, 13,  1, 18, 14,  1],
  /* wuku 11 */ [16, 24, 13,  8, 17, 26, 19],
  /* wuku 12 */ [25, 13, 13,  6,  8,  6, 27],
  /* wuku 13 */ [ 8,  6, 13,  8, 26,  3, 13],
  /* wuku 14 */ [26, 26, 15, 16, 27,  8, 13],
  /* wuku 15 */ [21,  8,  6, 26, 26,  6, 14],
  /* wuku 16 */ [26, 18, 14, 24,  6, 27, 21],
  /* wuku 17 */ [26, 26, 24,  8, 19, 19, 18],
  /* wuku 18 */ [ 8, 18,  8,  5, 27, 18,  6],
  /* wuku 19 */ [10, 13, 13, 14, 26, 19, 19],
  /* wuku 20 */ [ 6,  3, 26, 26,  3, 26, 18],
  /* wuku 21 */ [21, 15, 28, 24, 18,  9, 26],
  /* wuku 22 */ [18,  6, 18,  8,  7, 16, 19],
  /* wuku 23 */ [26,  3,  8, 14, 26, 21,  8],
  /* wuku 24 */ [16, 16, 24,  8,  9, 25,  3],
  /* wuku 25 */ [13, 10, 25, 25, 18, 25, 21],
  /* wuku 26 */ [ 8, 13, 13, 15, 19, 26, 21],
  /* wuku 27 */ [ 5, 19,  5, 21, 27, 13, 24],
  /* wuku 28 */ [19, 18, 18, 26, 16,  3, 25],
  /* wuku 29 */ [ 4,  3, 24, 26, 19, 26, 21],
  /* wuku 30 */ [15,  4,  3, 26,  8, 26, 18],
];

export function getEkaJalaRsi(noWuku: number, noSaptawara: number): number {
  return EJR_TABLE[noWuku - 1]?.[noSaptawara] ?? 0;
}

// ---------------------------------------------------------------------------
// Lintang
// ---------------------------------------------------------------------------

/**
 * Tabel LINTANG[noSaptawara][noPancawara-1] → noLintang (1–35)
 */
const LINTANG_TABLE: number[][] = [
  /* Redite    */ [15,  1, 22,  8, 29],
  /* Soma      */ [30, 16,  2, 23,  9],
  /* Anggara   */ [10, 31, 17, 23, 24],
  /* Buda      */ [25, 11, 32, 18,  4],
  /* Wrhaspati */ [ 5, 26, 12, 33, 19],
  /* Sukra     */ [20,  6, 27, 13, 34],
  /* Saniscara */ [35, 21,  7, 28, 15],
];

export function getLintang(noSaptawara: number, noPancawara: number): number {
  return LINTANG_TABLE[noSaptawara]?.[noPancawara - 1] ?? 0;
}

// ---------------------------------------------------------------------------
// Panca Sudha
// ---------------------------------------------------------------------------

type PS = [number, number]; // [noSaptawara, noPancawara]

const PANCASUDHA_GROUPS: PS[][] = [
  /* 1 — Wisesa segara  */ [[0,2],[3,2],[1,4],[5,5],[2,1],[6,3]],
  /* 2 — Tunggak semi   */ [[1,1],[4,4],[5,2],[6,5]],
  /* 3 — Satria wibhawa */ [[0,4],[2,3],[3,4],[4,1],[6,2]],
  /* 4 — Sumur sinaba   */ [[0,1],[1,3],[2,5],[3,1],[5,4]],
  /* 5 — Bumi kapetak   */ [[0,3],[1,2],[3,3],[4,5],[6,1]],
  /* 6 — Satria wirang  */ [[1,5],[2,2],[4,3],[5,1],[6,4]],
  /* 7 — Lebu katiup    */ [[0,5],[2,4],[3,5],[4,2],[5,3]],
];

export function getPancasudha(noSaptawara: number, noPancawara: number): number {
  for (let i = 0; i < PANCASUDHA_GROUPS.length; i++) {
    const group = PANCASUDHA_GROUPS[i]!;
    if (group.some(([s, p]) => s === noSaptawara && p === noPancawara)) {
      return i + 1;
    }
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Pararasan
// ---------------------------------------------------------------------------

const PARARASAN_GROUPS: PS[][] = [
  /* 1  — Laku bumi          */ [[2,4]],
  /* 2  — Laku api           */ [[1,4],[2,1]],
  /* 3  — Laku angin         */ [[0,4],[1,1]],
  /* 4  — Laku pandita sakti */ [[0,1],[2,3],[5,4]],
  /* 5  — Aras tuding        */ [[1,3],[2,5],[3,4],[5,1]],
  /* 6  — Aras kembang       */ [[0,3],[2,2],[1,5],[3,1],[4,4]],
  /* 7  — Laku bintang       */ [[0,5],[1,2],[4,1],[5,3],[6,4]],
  /* 8  — Laku bulan         */ [[0,2],[3,3],[5,5],[6,1]],
  /* 9  — Laku surya         */ [[3,5],[4,3],[5,2]],
  /* 10 — Laku air/toya      */ [[3,2],[4,5],[6,3]],
  /* 11 — Laku pretiwi       */ [[4,2],[6,5]],
  /* 12 — Laku agni agung    */ [[6,2]],
];

export function getPararasan(noSaptawara: number, noPancawara: number): number {
  for (let i = 0; i < PARARASAN_GROUPS.length; i++) {
    const group = PARARASAN_GROUPS[i]!;
    if (group.some(([s, p]) => s === noSaptawara && p === noPancawara)) {
      return i + 1;
    }
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Rakam
// ---------------------------------------------------------------------------

const SAPTAWARA_RAKAM = [3, 4, 5, 6, 7, 1, 2]; // noSaptawara 0–6
const PANCAWARA_RAKAM = [2, 3, 4, 5, 1];        // noPancawara 1–5

/** 1=Kala tinatang … 6=Nuju pati */
export function getRakam(noSaptawara: number, noPancawara: number): number {
  const s = SAPTAWARA_RAKAM[noSaptawara] ?? 0;
  const p = PANCAWARA_RAKAM[noPancawara - 1] ?? 0;
  const r = (s + p) % 6;
  return r === 0 ? 6 : r;
}

// ---------------------------------------------------------------------------
// Zodiak (Western, untuk info tambahan)
// ---------------------------------------------------------------------------

interface ZodiakRange { month: number; fromDay: number; toDay: number; no: number }

const ZODIAK_RANGES: ZodiakRange[] = [
  { month: 3,  fromDay: 20, toDay: 31, no: 1  }, // Aries
  { month: 4,  fromDay:  1, toDay: 19, no: 1  },
  { month: 4,  fromDay: 20, toDay: 30, no: 2  }, // Taurus
  { month: 5,  fromDay:  1, toDay: 20, no: 2  },
  { month: 5,  fromDay: 21, toDay: 31, no: 3  }, // Gemini
  { month: 6,  fromDay:  1, toDay: 20, no: 3  },
  { month: 6,  fromDay: 21, toDay: 30, no: 4  }, // Cancer
  { month: 7,  fromDay:  1, toDay: 22, no: 4  },
  { month: 7,  fromDay: 23, toDay: 31, no: 5  }, // Leo
  { month: 8,  fromDay:  1, toDay: 22, no: 5  },
  { month: 8,  fromDay: 23, toDay: 31, no: 6  }, // Virgo
  { month: 9,  fromDay:  1, toDay: 22, no: 6  },
  { month: 9,  fromDay: 23, toDay: 30, no: 7  }, // Libra
  { month: 10, fromDay:  1, toDay: 22, no: 7  },
  { month: 10, fromDay: 23, toDay: 31, no: 8  }, // Scorpio
  { month: 11, fromDay:  1, toDay: 21, no: 8  },
  { month: 11, fromDay: 22, toDay: 30, no: 9  }, // Sagitarius
  { month: 12, fromDay:  1, toDay: 21, no: 9  },
  { month: 12, fromDay: 22, toDay: 31, no: 10 }, // Capricorn
  { month: 1,  fromDay:  1, toDay: 19, no: 10 },
  { month: 1,  fromDay: 20, toDay: 31, no: 11 }, // Aquarius
  { month: 2,  fromDay:  1, toDay: 17, no: 11 },
  { month: 2,  fromDay: 18, toDay: 29, no: 12 }, // Pisces
  { month: 3,  fromDay:  1, toDay: 19, no: 12 },
];

export function getZodiak(date: Date): number {
  const M = date.getMonth() + 1;
  const D = date.getDate();
  return ZODIAK_RANGES.find(r => r.month === M && D >= r.fromDay && D <= r.toDay)?.no ?? 0;
}
