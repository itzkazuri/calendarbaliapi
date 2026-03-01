// ============================================================
// saka.ts — Perhitungan kalender Saka (Penanggal, Pangelong,
//           Sasih, Ngunaratri, Nampih)
// ============================================================

import type { SakaDate, SakaCalendarPivot } from "./types";
import { getDateDiffDays } from "./utils";
import { getWuku, getSaptawara, getPancawara } from "./pawukon";

// ---------------------------------------------------------------------------
// Helper: apakah ngunaratri terjadi?
// ---------------------------------------------------------------------------

interface NgunaratriInput {
  noWuku: number;
  noPancawara: number;
  noSaptawara: number;
  penanggal: number;
  bedaHari: number;
  isAfter2000: boolean;
}

type GuardRow = { noWuku: number; noPancawara: number; penanggalSet: number[] };

/** Tabel ngunaratri untuk sistem Eka Sungsang ke Pahing (setelah 2000) */
const NGUNARATRI_PAHING: GuardRow[] = [
  { noWuku: 10, noPancawara: 2, penanggalSet: [14, 9,  4] },
  { noWuku: 19, noPancawara: 5, penanggalSet: [ 3, 13, 8] },
  { noWuku: 28, noPancawara: 3, penanggalSet: [ 7,  2, 12] },
  { noWuku:  7, noPancawara: 1, penanggalSet: [11,  6,  1] },
  { noWuku: 16, noPancawara: 4, penanggalSet: [15, 10,  5] },
  { noWuku: 25, noPancawara: 2, penanggalSet: [ 4, 14,  9] },
  { noWuku:  4, noPancawara: 5, penanggalSet: [ 8,  3, 13] },
  { noWuku: 13, noPancawara: 3, penanggalSet: [12,  7,  2] },
  { noWuku: 22, noPancawara: 1, penanggalSet: [ 1, 11,  6] },
  { noWuku:  1, noPancawara: 4, penanggalSet: [ 5, 15, 10] },
];

/** Tabel ngunaratri untuk sistem Eka Sungsang ke Pon (sebelum 2000) */
const NGUNARATRI_PON: GuardRow[] = [
  { noWuku: 10, noPancawara: 3, penanggalSet: [14, 9,  4] },
  { noWuku: 19, noPancawara: 1, penanggalSet: [ 3, 13, 8] },
  { noWuku: 28, noPancawara: 4, penanggalSet: [ 7,  2, 12] },
  { noWuku:  7, noPancawara: 2, penanggalSet: [11,  6,  1] },
  { noWuku: 16, noPancawara: 5, penanggalSet: [15, 10,  5] },
  { noWuku: 25, noPancawara: 3, penanggalSet: [ 4, 14,  9] },
  { noWuku:  4, noPancawara: 1, penanggalSet: [ 8,  3, 13] },
  { noWuku: 13, noPancawara: 4, penanggalSet: [12,  7,  2] },
  { noWuku: 22, noPancawara: 2, penanggalSet: [ 1, 11,  6] },
  { noWuku:  1, noPancawara: 5, penanggalSet: [ 5, 15, 10] },
];

/**
 * Versi "offset" dari tabel yang sama — dipakai untuk bedaHari <= 0
 * (penanggal geser +1 karena ngunaratri belum terjadi di pivot)
 */
function offsetPenanggalSet(rows: GuardRow[]): GuardRow[] {
  return rows.map(r => ({
    ...r,
    penanggalSet: r.penanggalSet.map(p => (p === 15 ? 1 : p + 1)),
  }));
}

function matchNgunaratri(
  table: GuardRow[],
  noWuku: number,
  noPancawara: number,
  penanggal: number,
): boolean {
  return table.some(
    row =>
      row.noWuku === noWuku &&
      row.noPancawara === noPancawara &&
      row.penanggalSet.includes(penanggal),
  );
}

// ---------------------------------------------------------------------------
// Fungsi utama
// ---------------------------------------------------------------------------

export function hitungSaka(timestampMs: number, pivot: SakaCalendarPivot, date: Date): SakaDate {
  const bedaHari = getDateDiffDays(pivot.timestampMs, timestampMs);

  const { noWuku, angkaWuku } = getWuku(timestampMs, pivot);
  const { noPancawara }       = getPancawara(angkaWuku);
  const { noSaptawara }       = getSaptawara(date);
  const isAfter2000           = date.getFullYear() > 1999;

  /* ---- 1. PENANGGAL / PANGELONG ---- */
  let jumlahNgunaratri = 0;

  // Menentukan kelipatan 63 terdekat di bawah noNgunaratri
  let mulai = 0;
  const noNgunaratriCurr = pivot.noNgunaratri + bedaHari;

  if (bedaHari >= 0) {
    if (pivot.noNgunaratri > 63) {
      mulai =
        pivot.noNgunaratri % 63 === 0
          ? pivot.noNgunaratri - 63
          : pivot.noNgunaratri - (pivot.noNgunaratri % 63);
    }

    if (noNgunaratriCurr > mulai + 63) {
      jumlahNgunaratri = Math.floor((noNgunaratriCurr - (mulai + 63)) / 63) + 1;
      if ((noNgunaratriCurr - (mulai + 63)) % 63 === 0) jumlahNgunaratri--;
    }

    if (pivot.isNgunaratri) jumlahNgunaratri++;

    let hasilNgunaratri = (bedaHari + pivot.penanggal + jumlahNgunaratri) % 15;
    if (hasilNgunaratri === 0) hasilNgunaratri = 15;

    var penanggal = hasilNgunaratri;
    var isPangelong =
      (Math.floor((bedaHari + pivot.penanggal + jumlahNgunaratri - 1) / 15) % 2 === 0) ===
      pivot.isPangelong;
  } else {
    const noNgPlus63 = pivot.noNgunaratri + 63;
    if (noNgPlus63 > 63) {
      mulai =
        noNgPlus63 % 63 === 0
          ? noNgPlus63 - 63
          : noNgPlus63 - (noNgPlus63 % 63);
    }

    if (noNgunaratriCurr < mulai - 63) {
      jumlahNgunaratri = Math.floor((-(noNgunaratriCurr - (mulai - 63))) / 63) + 1;
      if ((-(noNgunaratriCurr - (mulai - 63))) % 63 === 0) jumlahNgunaratri--;
    }

    let hasilNgunaratri = bedaHari + pivot.penanggal - jumlahNgunaratri;
    hasilNgunaratri = 15 - (-hasilNgunaratri % 15);

    var penanggal   = hasilNgunaratri <= 15 ? hasilNgunaratri : hasilNgunaratri % 15;
    var isPangelong =
      (Math.floor((-bedaHari + penanggal + jumlahNgunaratri - 1) / 15) % 2 === 0) ===
      pivot.isPangelong;
  }

  /* ---- 2. NGUNARATRI ---- */
  let isNgunaratri = false;

  const activeTable   = isAfter2000 ? NGUNARATRI_PAHING : NGUNARATRI_PON;
  const saptawaraTest = isAfter2000 ? 2 : 3; // Anggara (Pahing) atau Buda (Pon)

  if (noSaptawara === saptawaraTest) {
    if (bedaHari > 0) {
      if (matchNgunaratri(activeTable, noWuku, noPancawara, penanggal)) {
        isNgunaratri = true;
      }
    } else {
      const offsetTable = offsetPenanggalSet(activeTable);
      if (matchNgunaratri(offsetTable, noWuku, noPancawara, penanggal)) {
        isNgunaratri = true;
        penanggal   -= 1;
        if (penanggal === 0 && !isPangelong) isPangelong = true;
        if (penanggal === 0) penanggal = 15;
      }
    }
  }

  /* ---- 3. SASIH & TAHUN SAKA ---- */
  let bedaHariSasih     = bedaHari;
  let tahunSaka         = pivot.tahunSaka;
  let noSasih           = pivot.noSasih;
  let isNampih          = false;
  let jumlahNampih      = 0;
  let perulangan1       = 0;
  let perulangan2       = pivot.noSasih;
  let isNampihFlag      = false;

  const use1992System =
    date.getFullYear() >= 1992 && date.getFullYear() <= 2002;

  /** Sasih forward nampih check */
  function checkNampihForward(ts: number, pn: number): void {
    if (!use1992System) {
      // Sistem standar (% 19 → 0, 6, 11 → nampih Sadha; 3, 8, 14, 16 → nampih Destha)
      if ([0, 6, 11].includes(ts % 19)) {
        isNampih = pn === 12;
        if (pn === 1) { perulangan2--; jumlahNampih++; isNampihFlag = true; }
      } else if ([3, 8, 14, 16].includes(ts % 19)) {
        isNampih = pn === 1;
        if (pn === 2) { perulangan2--; jumlahNampih++; isNampihFlag = true; }
      }
    } else {
      // Sistem 1992–2002
      const r = ts % 19;
      if ([2, 10].includes(r)) {
        isNampih = pn === 12;
        if (pn === 1)  { perulangan2--; jumlahNampih++; isNampihFlag = true; }
      } else if (r === 4) {
        isNampih = pn === 4;
        if (pn === 5)  { perulangan2--; jumlahNampih++; isNampihFlag = true; }
      } else if (r === 7) {
        isNampih = pn === 2;
        if (pn === 3)  { perulangan2--; jumlahNampih++; isNampihFlag = true; }
      } else if (r === 13) {
        isNampih = pn === 11;
        if (pn === 12) { perulangan2--; jumlahNampih++; isNampihFlag = true; }
      } else if (r === 15) {
        isNampih = pn === 3;
        if (pn === 4)  { perulangan2--; jumlahNampih++; isNampihFlag = true; }
      } else if (r === 18) {
        isNampih = pn === 1;
        if (pn === 2)  { perulangan2--; jumlahNampih++; isNampihFlag = true; }
      }
    }
  }

  /** Sasih backward nampih check */
  function checkNampihBackward(ts: number, pn: number): void {
    if (!use1992System) {
      if ([0, 6, 11].includes(ts % 19)) {
        isNampih = pn === 11;
        if (pn === 10) { perulangan2++; jumlahNampih++; isNampihFlag = true; }
      } else if ([3, 8, 14, 16].includes(ts % 19)) {
        isNampih = pn === 12;
        if (pn === 11) { perulangan2++; jumlahNampih++; isNampihFlag = true; }
      }
    } else {
      const r = ts % 19;
      if ([2, 10].includes(r)) {
        isNampih = pn === 11;
        if (pn === 10) { perulangan2++; jumlahNampih++; isNampihFlag = true; }
      } else if (r === 4) {
        isNampih = pn === 3;
        if (pn === 2)  { perulangan2++; jumlahNampih++; isNampihFlag = true; }
      } else if (r === 7) {
        isNampih = pn === 1;
        if (pn === 12) { perulangan2++; jumlahNampih++; isNampihFlag = true; }
      } else if (r === 13) {
        isNampih = pn === 10;
        if (pn === 9)  { perulangan2++; jumlahNampih++; isNampihFlag = true; }
      } else if (r === 15) {
        isNampih = pn === 2;
        if (pn === 1)  { perulangan2++; jumlahNampih++; isNampihFlag = true; }
      } else if (r === 18) {
        isNampih = pn === 12;
        if (pn === 11) { perulangan2++; jumlahNampih++; isNampihFlag = true; }
      }
    }
  }

  if (bedaHariSasih >= 0) {
    if (pivot.isPangelong) {
      bedaHariSasih = bedaHariSasih + 15 + (pivot.penanggal - 1);
    } else {
      bedaHariSasih = bedaHariSasih + (pivot.penanggal - 1);
    }

    const hasilSasih = Math.floor((bedaHariSasih + jumlahNgunaratri) / 30);

    while (perulangan1 < hasilSasih) {
      perulangan1++;
      perulangan2 = (perulangan2 % 12) + 1;
      if (perulangan2 === 10) tahunSaka++;

      if (isNampihFlag) {
        isNampihFlag = false;
      } else {
        checkNampihForward(tahunSaka, perulangan2);
      }
    }

    noSasih = (hasilSasih - jumlahNampih + pivot.noSasih) % 12;
    if (isNampih) noSasih--;
    if (noSasih < 0) noSasih = 12 - (-noSasih % 12);
    if (noSasih === 0) noSasih = 12;

  } else {
    if (pivot.isPangelong) {
      bedaHariSasih = bedaHariSasih - (15 - pivot.penanggal);
    } else {
      bedaHariSasih = bedaHariSasih - 15 - (15 - pivot.penanggal);
    }

    const hasilSasih = Math.floor(-(bedaHariSasih - jumlahNgunaratri) / 30);

    while (perulangan1 < hasilSasih) {
      perulangan1++;
      perulangan2--;
      perulangan2 = perulangan2 % 12;
      if (perulangan2 === 0) perulangan2 = 12;
      if (perulangan2 === 9) tahunSaka--;

      if (isNampihFlag) {
        isNampihFlag = false;
      } else {
        checkNampihBackward(tahunSaka, perulangan2);
      }
    }

    noSasih = pivot.noSasih - hasilSasih + jumlahNampih;
    if (noSasih < 0) noSasih = 12 - (-noSasih % 12);
    if (noSasih === 0) noSasih = 12;

    if (isNgunaratri && penanggal === 15) noSasih--;
    if (isPangelong && penanggal === 15 && isNgunaratri && isNampih) isNampih = false;
  }

  return {
    tahunSaka,
    penanggal,
    noSasih,
    noNgunaratri: noNgunaratriCurr,
    isNgunaratri,
    isPangelong,
    isNampih,
  };
}
