import { SakaCalendar } from "./SakaCalendar";
import {
  ANGKA_WUKU,
  NO_WUKU,
  NO_SAPTAWARA,
  NO_PANCAWARA,
  NO_SASIH,
  PENANGGAL,
  IS_PANGELONG,
} from "./types";

export interface HariRaya {
  nama: string;
  deskripsi?: string;
}

type PawukonRule = {
  nama: string;
  noWuku: number;
  noSaptawara: number;
  noPancawara: number;
};

const PAWUKON_RULES: PawukonRule[] = [
  { nama: "Saraswati", noWuku: 30, noSaptawara: 6, noPancawara: 1 },
  { nama: "Pagerwesi", noWuku: 1, noSaptawara: 3, noPancawara: 5 },
  { nama: "Tumpek Landep", noWuku: 2, noSaptawara: 6, noPancawara: 5 },
  { nama: "Redite Umanis Ukir", noWuku: 3, noSaptawara: 0, noPancawara: 1 },
  { nama: "Buda Wage Ukir", noWuku: 3, noSaptawara: 3, noPancawara: 4 },
  { nama: "Anggar Kasih Kulantir", noWuku: 4, noSaptawara: 2, noPancawara: 5 },
  { nama: "Soma Umanis Tolu", noWuku: 5, noSaptawara: 1, noPancawara: 1 },
  { nama: "Tumpek Uduh", noWuku: 5, noSaptawara: 6, noPancawara: 5 },
  { nama: "Buda Keliwon Gumbreg", noWuku: 6, noSaptawara: 3, noPancawara: 5 },
  { nama: "Hari Bhatara Sri", noWuku: 7, noSaptawara: 6, noPancawara: 5 },
  { nama: "Soma Paing Warigadean", noWuku: 8, noSaptawara: 1, noPancawara: 2 },
  { nama: "Buda Wage Warigadean", noWuku: 8, noSaptawara: 3, noPancawara: 4 },
  { nama: "Anggar Kasih Julungwangi", noWuku: 9, noSaptawara: 2, noPancawara: 5 },
  { nama: "Buda Wage Langkir", noWuku: 13, noSaptawara: 3, noPancawara: 4 },
  { nama: "Anggar Kasih Medangsia", noWuku: 14, noSaptawara: 2, noPancawara: 5 },
  { nama: "Tumpek Krulut", noWuku: 17, noSaptawara: 6, noPancawara: 5 },
  { nama: "Buda Wage Merakih", noWuku: 18, noSaptawara: 3, noPancawara: 4 },
  { nama: "Anggar Kasih Tambir", noWuku: 19, noSaptawara: 2, noPancawara: 5 },
  { nama: "Anggara Paing Medangkungan", noWuku: 20, noSaptawara: 2, noPancawara: 2 },
  { nama: "Buda Keliwon Matal", noWuku: 21, noSaptawara: 3, noPancawara: 5 },
  { nama: "Tumpek Kandang", noWuku: 22, noSaptawara: 6, noPancawara: 5 },
  { nama: "Buda Wage Menail", noWuku: 23, noSaptawara: 3, noPancawara: 4 },
  { nama: "Buda Keliwon Pegatuwakan", noWuku: 24, noSaptawara: 3, noPancawara: 5 },
  { nama: "Buda Keliwon Ugu", noWuku: 26, noSaptawara: 3, noPancawara: 5 },
  { nama: "Tumpek Wayang", noWuku: 27, noSaptawara: 6, noPancawara: 5 },
  { nama: "Buda Wage Kulawu", noWuku: 28, noSaptawara: 3, noPancawara: 4 },
  { nama: "Anggar Kasih Dukut", noWuku: 29, noSaptawara: 2, noPancawara: 5 },
];

const GALUNGAN_OFFSETS: Record<number, string> = {
  [-6]: "Sugihan Jawa",
  [-5]: "Sugihan Bali",
  [-3]: "Penyekeban",
  [-2]: "Penyajaan Galungan",
  [-1]: "Penampahan Galungan",
  0: "Galungan",
  1: "Manis Galungan",
  3: "Pemaridan Guru",
  4: "Ulihan",
  5: "Pemacekan Agung",
  7: "Buda Paing Kuningan",
  9: "Penampahan Kuningan",
  10: "Kuningan",
  42: "Buda Keliwon Pegatuwakan",
};

const SARASWATI_OFFSETS: Record<number, string> = {
  [-4]: "Paid-Paidan",
  [-3]: "Hari Urip",
  [-2]: "Hari Patetegan",
  [-1]: "Hari Pangredanaan",
  1: "Banyu Pinaruh",
  2: "Soma Ribek",
  3: "Sabuh Mas",
};

function angkaWukuFrom(noWuku: number, noSaptawara: number): number {
  return (noWuku - 1) * 7 + (noSaptawara + 1);
}

function normalizeDiff(diff: number, cycle: number): number {
  let d = diff % cycle;
  if (d > cycle / 2) d -= cycle;
  if (d < -cycle / 2) d += cycle;
  return d;
}

function addUnique(list: HariRaya[], item: HariRaya): void {
  if (!list.some((r) => r.nama === item.nama)) {
    list.push(item);
  }
}

export function getHariRayaEngine(cal: SakaCalendar): HariRaya[] {
  const rahinan: HariRaya[] = [];

  const noWuku = cal.getWuku(NO_WUKU);
  const noSaptawara = cal.getSaptawara(NO_SAPTAWARA);
  const noPancawara = cal.getPancawara(NO_PANCAWARA);
  const angkaWuku = cal.getWuku(ANGKA_WUKU);
  const noTriwara = cal.getTriwara();

  const noSasih = cal.getSakaCalendar(NO_SASIH);
  const penanggal = cal.getSakaCalendar(PENANGGAL);
  const isPangelong = cal.getSakaCalendarStatus(IS_PANGELONG);

  // 🔵 ENGINE 1 — Pawukon murni (noWuku, noSaptawara, noPancawara)
  for (const rule of PAWUKON_RULES) {
    if (
      rule.noWuku === noWuku &&
      rule.noSaptawara === noSaptawara &&
      rule.noPancawara === noPancawara
    ) {
      addUnique(rahinan, { nama: rule.nama });
    }
  }

  // 🟢 ENGINE 2 — Relatif Galungan (anchor: Buda Kliwon Dungulan)
  const galunganAw = angkaWukuFrom(11, 3);
  const gDiff = normalizeDiff(angkaWuku - galunganAw, 210);
  if (GALUNGAN_OFFSETS[gDiff]) {
    addUnique(rahinan, { nama: GALUNGAN_OFFSETS[gDiff] });
  }

  // 🟡 ENGINE 3 — Relatif Saraswati (anchor: Saniscara Umanis Watugunung)
  const saraswatiAw = angkaWukuFrom(30, 6);
  const sDiff = normalizeDiff(angkaWuku - saraswatiAw, 210);
  if (SARASWATI_OFFSETS[sDiff]) {
    addUnique(rahinan, { nama: SARASWATI_OFFSETS[sDiff] });
  }

  // 🟠 ENGINE 4 — Saka (Purnama, Tilem, Siwa Ratri, Nyepi, Ngembak Geni)
  if (penanggal === 15) {
    addUnique(rahinan, { nama: isPangelong ? "Tilem" : "Purnama" });
  }

  if (noSasih === 7 && penanggal === 14 && isPangelong) {
    addUnique(rahinan, { nama: "Siwa Ratri" });
  }

  if (noSasih === 10 && penanggal === 1 && !isPangelong) {
    addUnique(rahinan, { nama: "Nyepi", deskripsi: "Tahun Baru Saka" });
  }

  const yesterday = new Date(cal.nativeDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const calPrev = new SakaCalendar(yesterday);
  const prevNyepi =
    calPrev.getSakaCalendar(NO_SASIH) === 10 &&
    calPrev.getSakaCalendar(PENANGGAL) === 1 &&
    !calPrev.getSakaCalendarStatus(IS_PANGELONG);
  if (prevNyepi) {
    addUnique(rahinan, { nama: "Ngembak Geni" });
  }

  // 🔴 ENGINE 5 — Hybrid Saka + Pawukon (Kajeng Keliwon)
  if (noTriwara === 3 && noPancawara === 5) {
    if (noWuku === 30 && noSaptawara === 0) {
      addUnique(rahinan, { nama: "Kajeng Kliwon Pamelastali" });
    } else if (isPangelong) {
      addUnique(rahinan, { nama: "Kajeng Kliwon Uwudan" });
    } else {
      addUnique(rahinan, { nama: "Kajeng Kliwon Enyitan" });
    }
  }

  return rahinan;
}
