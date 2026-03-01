// ============================================================
// odalanEngine.ts — Odalan Tracker (Piodalan Pura)
// ============================================================

import { SakaCalendar } from "./SakaCalendar";
import { NO_WUKU, NO_SAPTAWARA, NO_PANCAWARA } from "./types";
import {
  NAMA_WUKU,
  NAMA_SAPTAWARA,
  NAMA_PANCAWARA,
  NAMA_SASIH,
} from "./names";
import { cariPurnamaTilem } from "./purnamaTilem";

export type SistemOdalan = "wuku" | "sasih";

export interface OdalanWuku {
  sistem: "wuku";
  noWuku: number;
  noSaptawara: number;
  noPancawara: number;
}

export interface OdalanSasih {
  sistem: "sasih";
  noSasih: number;
  isPurnama: boolean;
  offsetHari?: number;
}

export type DefinisiOdalan = OdalanWuku | OdalanSasih;

export interface ProfilPura {
  id: string;
  nama: string;
  lokasi?: string;
  deskripsi?: string;
  odalan: DefinisiOdalan;
}

export interface JadwalOdalan {
  tanggal: Date;
  siklus: number;
  namaHari: string;
  keterangan: string;
  isOdalanBesar: boolean;
}

export interface HasilOdalanPura {
  pura: ProfilPura;
  jadwalMendatang: JadwalOdalan[];
  berikutnya: JadwalOdalan | null;
}

export const PURA_PRESET: ProfilPura[] = [
  {
    id: "pura_besakih_purnama_kadasa",
    nama: "Pura Agung Besakih (Bhatara Turun Kabeh)",
    lokasi: "Karangasem",
    deskripsi: "Upacara tahunan Bhatara Turun Kabeh — Purnama Kadasa",
    odalan: { sistem: "sasih", noSasih: 10, isPurnama: true },
  },
  {
    id: "pura_ulun_danu_batur",
    nama: "Pura Ulun Danu Batur",
    lokasi: "Bangli",
    deskripsi: "Odalan ageng — Purnama Kapat",
    odalan: { sistem: "sasih", noSasih: 4, isPurnama: true },
  },
  {
    id: "pura_tanah_lot",
    nama: "Pura Tanah Lot",
    lokasi: "Tabanan",
    deskripsi: "Odalan — Buda Wage Langkir",
    odalan: { sistem: "wuku", noWuku: 13, noSaptawara: 3, noPancawara: 4 },
  },
  {
    id: "pura_luhur_uluwatu",
    nama: "Pura Luhur Uluwatu",
    lokasi: "Badung",
    deskripsi: "Odalan — Selasa Kliwon Wuku Medangsya",
    odalan: { sistem: "wuku", noWuku: 14, noSaptawara: 2, noPancawara: 5 },
  },
  {
    id: "pura_goa_lawah",
    nama: "Pura Goa Lawah",
    lokasi: "Klungkung",
    deskripsi: "Odalan — Purnama Kalima",
    odalan: { sistem: "sasih", noSasih: 5, isPurnama: true },
  },
  {
    id: "galungan_kuningan",
    nama: "Hari Raya Galungan",
    lokasi: "Seluruh Bali",
    deskripsi: "Buda Kliwon Dungulan — setiap 210 hari",
    odalan: { sistem: "wuku", noWuku: 11, noSaptawara: 3, noPancawara: 5 },
  },
  {
    id: "saraswati",
    nama: "Hari Raya Saraswati",
    lokasi: "Seluruh Bali",
    deskripsi: "Saniscara Umanis Watugunung — setiap 210 hari",
    odalan: { sistem: "wuku", noWuku: 30, noSaptawara: 6, noPancawara: 1 },
  },
];

export function hitungOdalan(
  pura: ProfilPura,
  dariTanggal: Date = new Date(),
  jumlahKedepan = 5,
): HasilOdalanPura {
  const odalan = pura.odalan;
  let jadwal: JadwalOdalan[];

  if (odalan.sistem === "wuku") {
    jadwal = hitungOdalanWuku(odalan, dariTanggal, jumlahKedepan);
  } else {
    jadwal = hitungOdalanSasih(odalan, dariTanggal, jumlahKedepan);
  }

  return {
    pura,
    jadwalMendatang: jadwal,
    berikutnya: jadwal[0] ?? null,
  };
}

function hitungOdalanWuku(
  def: OdalanWuku,
  dariTanggal: Date,
  jumlahKedepan: number,
): JadwalOdalan[] {
  const hasil: JadwalOdalan[] = [];
  const mulai = normalHari(dariTanggal);

  const batas = new Date(mulai);
  batas.setDate(batas.getDate() + 210 * (jumlahKedepan + 1));

  const cursor = new Date(mulai);
  let siklus = 1;

  while (cursor <= batas && hasil.length < jumlahKedepan) {
    const cal = new SakaCalendar(new Date(cursor));

    const noWuku = cal.getWuku(NO_WUKU);
    const noSaptawara = cal.getSaptawara(NO_SAPTAWARA);
    const noPancawara = cal.getPancawara(NO_PANCAWARA);

    if (
      noWuku === def.noWuku &&
      noSaptawara === def.noSaptawara &&
      noPancawara === def.noPancawara
    ) {
      const namaHari = `${NAMA_SAPTAWARA[noSaptawara]} ${
        NAMA_PANCAWARA[noPancawara]
      } ${NAMA_WUKU[noWuku]}`;
      hasil.push({
        tanggal: new Date(cursor),
        siklus,
        namaHari,
        keterangan: `Odalan Wuku — ${namaHari}`,
        isOdalanBesar: siklus % 5 === 0,
      });
      siklus += 1;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return hasil;
}

function hitungOdalanSasih(
  def: OdalanSasih,
  dariTanggal: Date,
  jumlahKedepan: number,
): JadwalOdalan[] {
  const hasil: JadwalOdalan[] = [];
  const mulai = normalHari(dariTanggal);

  const batasMs = mulai.getTime() + 354 * 86400000 * (jumlahKedepan + 2);
  const batas = new Date(batasMs);

  const purnamaTilem = cariPurnamaTilem(mulai, batas, {
    jenis: def.isPurnama ? "purnama" : "tilem",
  });

  let siklus = 1;

  for (const pt of purnamaTilem) {
    if (pt.noSasih === def.noSasih) {
      const offsetHari = def.offsetHari ?? 0;
      const tgl = new Date(pt.date.getTime() + offsetHari * 86400000);

      const namaJenis = def.isPurnama ? "Purnama" : "Tilem";
      const namaSasih = NAMA_SASIH[def.noSasih] ?? `Sasih ${def.noSasih}`;
      const namaHari = `${namaJenis} ${namaSasih}${
        offsetHari ? ` +${offsetHari} hari` : ""
      }`;

      hasil.push({
        tanggal: tgl,
        siklus,
        namaHari,
        keterangan: `Odalan Sasih — ${namaHari}`,
        isOdalanBesar: siklus % 5 === 0,
      });

      siklus += 1;
      if (hasil.length >= jumlahKedepan) break;
    }
  }

  return hasil;
}

export function isOdalanHariIni(
  pura: ProfilPura,
  hari: Date = new Date(),
): boolean {
  const hasil = hitungOdalan(pura, normalHari(hari), 1);
  if (!hasil.berikutnya) return false;
  return (
    normalHari(hasil.berikutnya.tanggal).getTime() ===
    normalHari(hari).getTime()
  );
}

export function hitungBanyakOdalan(
  daftarPura: ProfilPura[],
  dariTanggal: Date = new Date(),
  jumlahPerPura = 3,
): { pura: ProfilPura; jadwal: JadwalOdalan }[] {
  const semua: { pura: ProfilPura; jadwal: JadwalOdalan }[] = [];

  for (const pura of daftarPura) {
    const hasil = hitungOdalan(pura, dariTanggal, jumlahPerPura);
    for (const j of hasil.jadwalMendatang) {
      semua.push({ pura, jadwal: j });
    }
  }

  return semua.sort(
    (a, b) => a.jadwal.tanggal.getTime() - b.jadwal.tanggal.getTime(),
  );
}

export function buatPuraWuku(
  id: string,
  nama: string,
  noWuku: number,
  noSaptawara: number,
  noPancawara: number,
  lokasi?: string,
): ProfilPura {
  return {
    id,
    nama,
    lokasi,
    odalan: { sistem: "wuku", noWuku, noSaptawara, noPancawara },
  };
}

export function buatPuraSasih(
  id: string,
  nama: string,
  noSasih: number,
  isPurnama: boolean,
  lokasi?: string,
  offsetHari = 0,
): ProfilPura {
  return {
    id,
    nama,
    lokasi,
    odalan: { sistem: "sasih", noSasih, isPurnama, offsetHari },
  };
}

function normalHari(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
