// ============================================================
// otonanEngine.ts — Engine Pencarian Otonan Bali
// ============================================================

import { SakaCalendar } from "./SakaCalendar";
import { NO_WUKU, NO_SAPTAWARA, NO_PANCAWARA } from "./types";
import {
  NAMA_WUKU,
  NAMA_SAPTAWARA,
  NAMA_PANCAWARA,
  NAMA_DASAWARA,
} from "./names";

// ---------------------------------------------------------------------------
// Tipe data
// ---------------------------------------------------------------------------

export interface InfoKelahiran {
  tanggal: Date;
  noWuku: number;
  namaWuku: string;
  noSaptawara: number;
  namaSaptawara: string;
  noPancawara: number;
  namaPancawara: string;
  /** Nama otonan lengkap: "{Saptawara} {Pancawara} {Wuku}" */
  namaOtonan: string;
  uripSaptawara: number;
  uripPancawara: number;
  uripGabungan: number; // = urip saptawara + urip pancawara
  /** Perkiraan "jatah umur" menurut Wariga: uripGabungan × 6 */
  perkiraanUmur: number;
  noDasawara: number;
  namaDasawara: string;
  /** Palintangan Bali: kombinasi Saptawara × Pancawara (35 zodiak) */
  palintangan: InfoPalintangan;
  /** Info wuku: dewa pelindung, pengawak, sifat umum */
  infoWuku: InfoWuku;
}

export interface HasilOtonan {
  kelahiran: InfoKelahiran;
  /** Tanggal-tanggal otonan mendatang */
  jadwalOtonan: JadwalOtonan[];
  /** Otonan berikutnya dari hari ini */
  berikutnya: JadwalOtonan | null;
  /** Sudah berapa "oton" (siklus 210 hari) sejak lahir */
  jumlahOton: number;
}

export interface JadwalOtonan {
  tanggal: Date;
  /** Ke-berapa siklus otonan ini (1 = pertama / 6 bulan pertama) */
  siklus: number;
  /** Usia dalam hari saat otonan ini */
  usiaDari: number;
  /** Usia perkiraan dalam tahun-bulan */
  usiaLabel: string;
  /** Apakah ini otonan besar (kelipatan 5 siklus = setiap 1050 hari) */
  isOtonanBesar: boolean;
}

export interface InfoPalintangan {
  nama: string;
  makna: string;
  sifat: string;
}

export interface InfoWuku {
  nama: string;
  dewaPelindung: string;
  pengawak: string;
  sifatUmum: string;
}

// ---------------------------------------------------------------------------
// Tabel urip (nilai/neptu)
// ---------------------------------------------------------------------------

/** Urip Saptawara: index 0=Redite, 1=Soma, ..., 6=Saniscara */
export const URIP_SAPTAWARA = [5, 4, 3, 7, 8, 6, 9];

/** Urip Pancawara: index 1=Umanis, 2=Pahing, 3=Pon, 4=Wage, 5=Kliwon */
export const URIP_PANCAWARA = [0, 5, 9, 7, 4, 8];

// ---------------------------------------------------------------------------
// Tabel Palintangan — 35 zodiak Bali (Saptawara × Pancawara)
// ---------------------------------------------------------------------------

interface DefPalintangan {
  nama: string;
  makna: string;
  sifat: string;
}

// [saptawara_idx_0-6][pancawara_idx_0-4] → idx pancawara 0=Umanis,1=Pahing,2=Pon,3=Wage,4=Kliwon
const TABEL_PALINTANGAN: DefPalintangan[][] = [
  // Redite (0)
  [
    {
      nama: "Redite Umanis",
      makna: "Matahari-Manis",
      sifat: "Periang, mudah bergaul, suka kesenangan, punya daya tarik alami",
    },
    {
      nama: "Redite Pahing",
      makna: "Matahari-Pedas",
      sifat: "Keras kepala, rajin, ambisius, kadang mudah marah",
    },
    {
      nama: "Redite Pon",
      makna: "Matahari-Penguasa",
      sifat: "Suka bergaul, humoris, berwibawa, kadang ceroboh",
    },
    {
      nama: "Redite Wage",
      makna: "Matahari-Pemelihara",
      sifat: "Penyabar, setia, kerja keras, tapi sering diremehkan",
    },
    {
      nama: "Redite Kliwon",
      makna: "Matahari-Pelebur",
      sifat: "Spiritual, intuitif, punya kharisma kuat, sensitif",
    },
  ],
  // Soma (1)
  [
    {
      nama: "Soma Umanis",
      makna: "Bulan-Manis",
      sifat: "Lembut, penuh kasih sayang, suka kedamaian, berbakat seni",
    },
    {
      nama: "Soma Pahing",
      makna: "Bulan-Pedas",
      sifat: "Pendiam tapi tegas, setia, rajin, kadang termenung",
    },
    {
      nama: "Soma Pon",
      makna: "Bulan-Penguasa",
      sifat: "Supel, dermawan, suka memimpin, mudah terpengaruh",
    },
    {
      nama: "Soma Wage",
      makna: "Bulan-Pemelihara",
      sifat: "Teliti, hemat, sabar, kurang percaya diri",
    },
    {
      nama: "Soma Kliwon",
      makna: "Bulan-Pelebur",
      sifat: "Bijaksana, spiritual, punya kemampuan batin, perlu menjaga emosi",
    },
  ],
  // Anggara (2)
  [
    {
      nama: "Anggara Umanis",
      makna: "Mars-Manis",
      sifat: "Bersemangat, berani, aktif, kadang impulsif",
    },
    {
      nama: "Anggara Pahing",
      makna: "Mars-Pedas",
      sifat: "Pemberani, pantang menyerah, mudah tersinggung, berjiwa kesatria",
    },
    {
      nama: "Anggara Pon",
      makna: "Mars-Penguasa",
      sifat: "Energik, suka tantangan, dermawan, kurang sabar",
    },
    {
      nama: "Anggara Wage",
      makna: "Mars-Pemelihara",
      sifat: "Pekerja keras, ulet, setia, kadang egois",
    },
    {
      nama: "Anggara Kliwon",
      makna: "Mars-Pelebur",
      sifat: "Kuat, tegas, punya kemampuan memimpin, perlu mengelola amarah",
    },
  ],
  // Buddha / Buda (3)
  [
    {
      nama: "Buda Umanis",
      makna: "Merkurius-Manis",
      sifat: "Cerdas, komunikatif, adaptif, suka belajar",
    },
    {
      nama: "Buda Pahing",
      makna: "Merkurius-Pedas",
      sifat: "Analitis, kritis, tekun, kadang perfeksionis",
    },
    {
      nama: "Buda Pon",
      makna: "Merkurius-Penguasa",
      sifat: "Pandai bergaul, kreatif, suka humor, perlu fokus",
    },
    {
      nama: "Buda Wage",
      makna: "Merkurius-Pemelihara",
      sifat: "Tertib, hemat, suka kedamaian, kadang ragu-ragu",
    },
    {
      nama: "Buda Kliwon",
      makna: "Merkurius-Pelebur",
      sifat: "Bijak, intuitif kuat, punya ilmu spiritual, peka",
    },
  ],
  // Wrhaspati / Wraspati (4)
  [
    {
      nama: "Wraspati Umanis",
      makna: "Jupiter-Manis",
      sifat: "Beruntung, dermawan, bijak, suka berbagi ilmu",
    },
    {
      nama: "Wraspati Pahing",
      makna: "Jupiter-Pedas",
      sifat: "Berwibawa, keras dalam prinsip, adil, kadang kaku",
    },
    {
      nama: "Wraspati Pon",
      makna: "Jupiter-Penguasa",
      sifat: "Pemimpin alami, murah hati, karismatik, perlu waspada kesombongan",
    },
    {
      nama: "Wraspati Wage",
      makna: "Jupiter-Pemelihara",
      sifat: "Tekun, dapat diandalkan, suka membantu, kadang terlalu patuh",
    },
    {
      nama: "Wraspati Kliwon",
      makna: "Jupiter-Pelebur",
      sifat: "Sangat spiritual, berbudi luhur, bijaksana, dekat dengan yang suci",
    },
  ],
  // Sukra (5)
  [
    {
      nama: "Sukra Umanis",
      makna: "Venus-Manis",
      sifat: "Indah, menarik, penuh cinta, berbakat seni dan estetika",
    },
    {
      nama: "Sukra Pahing",
      makna: "Venus-Pedas",
      sifat: "Berkarya keras, punya selera tinggi, kadang boros, ambisius",
    },
    {
      nama: "Sukra Pon",
      makna: "Venus-Penguasa",
      sifat: "Sosial, romantis, suka kesenangan, perlu jaga stabilitas keuangan",
    },
    {
      nama: "Sukra Wage",
      makna: "Venus-Pemelihara",
      sifat: "Sabar, setia dalam cinta, hemat, bisa terlalu sensitif",
    },
    {
      nama: "Sukra Kliwon",
      makna: "Venus-Pelebur",
      sifat: "Karismatik, berbakat seni tinggi, spiritual, peka perasaan",
    },
  ],
  // Saniscara (6)
  [
    {
      nama: "Saniscara Umanis",
      makna: "Saturnus-Manis",
      sifat: "Sabar, bertahan lama, punya fondasi kuat, suka ketenangan",
    },
    {
      nama: "Saniscara Pahing",
      makna: "Saturnus-Pedas",
      sifat: "Disiplin, perfeksionis, pekerja keras, sulit kompromi",
    },
    {
      nama: "Saniscara Pon",
      makna: "Saturnus-Penguasa",
      sifat: "Teguh pendirian, berwibawa, suka bergaul, keras kepala",
    },
    {
      nama: "Saniscara Wage",
      makna: "Saturnus-Pemelihara",
      sifat: "Bertanggung jawab, setia, hemat, kadang terlalu serius",
    },
    {
      nama: "Saniscara Kliwon",
      makna: "Saturnus-Pelebur",
      sifat: "Kuat spiritual, penjaga tradisi, bijaksana, jarang bergaul",
    },
  ],
];

// ---------------------------------------------------------------------------
// Tabel Info Wuku — dewa pelindung & sifat tiap wuku
// ---------------------------------------------------------------------------

interface DefWuku {
  dewaPelindung: string;
  pengawak: string;
  sifatUmum: string;
}

const TABEL_WUKU: DefWuku[] = [
  { dewaPelindung: "", pengawak: "", sifatUmum: "" },
  {
    dewaPelindung: "Bhatara Yamadipati",
    pengawak: "Lembu",
    sifatUmum: "Kuat, pekerja keras, penyabar, tapi keras kepala",
  },
  {
    dewaPelindung: "Bhatara Mahadewa",
    pengawak: "Gajah",
    sifatUmum: "Gagah, berwibawa, suka keindahan, bisa angkuh",
  },
  {
    dewaPelindung: "Bhatara Mahesora",
    pengawak: "Harimau",
    sifatUmum: "Berani, tegas, pemberani, kadang suka bertengkar",
  },
  {
    dewaPelindung: "Bhatara Ludra",
    pengawak: "Singa",
    sifatUmum: "Kuat, berkuasa, dermawan, mudah marah",
  },
  {
    dewaPelindung: "Bhatara Brahma",
    pengawak: "Rangga",
    sifatUmum: "Kreatif, energik, suka hal baru, kurang sabar",
  },
  {
    dewaPelindung: "Bhatara Guru",
    pengawak: "Kijang",
    sifatUmum: "Cerdas, gesit, suka ilmu, tapi gelisah",
  },
  {
    dewaPelindung: "Bhatara Sangkara",
    pengawak: "Ular",
    sifatUmum: "Bijak, misterius, tenang, punya intuisi kuat",
  },
  {
    dewaPelindung: "Bhatara Maharesi",
    pengawak: "Gandarwa",
    sifatUmum: "Suka kesenangan, bersemangat, tapi bisa sombong",
  },
  {
    dewaPelindung: "Bhatara Komajaya",
    pengawak: "Merak",
    sifatUmum:
      "Indah, anggun, suka seni, kadang terlalu bergantung pada orang lain",
  },
  {
    dewaPelindung: "Bhatara Durgha",
    pengawak: "Naga",
    sifatUmum: "Kuat, penuh energi, punya daya magis, perlu kendalikan ego",
  },
  {
    dewaPelindung: "Bhatara Indra",
    pengawak: "Gajah",
    sifatUmum: "Beruntung, berwibawa, suka pembaruan, kadang keras kepala",
  },
  {
    dewaPelindung: "Bhatara Wisnu",
    pengawak: "Penyu",
    sifatUmum:
      "Sabar, setia, penjaga tradisi, punya ketahanan mental tinggi",
  },
  {
    dewaPelindung: "Bhatara Kala",
    pengawak: "Kambing",
    sifatUmum: "Kritis, analitis, suka tantangan, bisa keras",
  },
  {
    dewaPelindung: "Bhatara Gana",
    pengawak: "Lembu",
    sifatUmum: "Suka seni, spiritual, dermawan, perlu jaga kesehatan",
  },
  {
    dewaPelindung: "Bhatara Brahma",
    pengawak: "Gajah",
    sifatUmum: "Ambisius, berani, suka memimpin, perlu jaga emosi",
  },
  {
    dewaPelindung: "Bhatara Anantaboga",
    pengawak: "Naga",
    sifatUmum: "Kaya ide, punya kemampuan gaib, perlu waspada godaan",
  },
  {
    dewaPelindung: "Bhatara Kamajaya",
    pengawak: "Kijang",
    sifatUmum: "Romantis, kreatif, suka kesenangan, perlu stabilitas",
  },
  {
    dewaPelindung: "Bhatara Brahma",
    pengawak: "Lembu",
    sifatUmum: "Pekerja keras, teguh, bisa kaku dalam bergaul",
  },
  {
    dewaPelindung: "Bhatara Siwa",
    pengawak: "Harimau",
    sifatUmum: "Tegas, berwibawa, spiritual, perlu jaga amarah",
  },
  {
    dewaPelindung: "Bhatara Brahma",
    pengawak: "Gajah",
    sifatUmum: "Kuat, berpendirian, perlu menjaga kerendahan hati",
  },
  {
    dewaPelindung: "Bhatara Kala",
    pengawak: "Singa",
    sifatUmum: "Berani, energik, suka tantangan, perlu atur impulsivitas",
  },
  {
    dewaPelindung: "Bhatara Rare Angon",
    pengawak: "Sapi",
    sifatUmum: "Dekat alam, penyayang hewan, tenang, bisa terlalu pasif",
  },
  {
    dewaPelindung: "Bhatara Wisnu",
    pengawak: "Garuda",
    sifatUmum:
      "Bebas, mandiri, jiwa petualang, perlu komitmen lebih",
  },
  {
    dewaPelindung: "Bhatara Brahma",
    pengawak: "Banteng",
    sifatUmum: "Kuat fisik, ulet, keras kepala, setia",
  },
  {
    dewaPelindung: "Bhatara Guru",
    pengawak: "Singa",
    sifatUmum: "Bertenaga, suka belajar, perlu jaga kesombongan",
  },
  {
    dewaPelindung: "Bhatara Siwa",
    pengawak: "Kerbau",
    sifatUmum: "Kuat, pekerja keras, setia, perlu belajar fleksibel",
  },
  {
    dewaPelindung: "Bhatara Iswara",
    pengawak: "Garuda",
    sifatUmum:
      "Kreatif, suka seni pertunjukan, karismatik, perlu menjaga moral",
  },
  {
    dewaPelindung: "Bhatara Sangkara",
    pengawak: "Lembu",
    sifatUmum: "Tekun, sabar, setia, sedikit tertutup",
  },
  {
    dewaPelindung: "Bhatara Brahma",
    pengawak: "Harimau",
    sifatUmum: "Berani, tegas, suka tantangan, perlu jaga hubungan sosial",
  },
  {
    dewaPelindung: "Bhatara Siwa",
    pengawak: "Naga",
    sifatUmum:
      "Akhir siklus, kaya pengalaman, bijak, perlu persiapkan kelahiran baru",
  },
];

// ---------------------------------------------------------------------------
// Helper: hitung info kelahiran dari Date
// ---------------------------------------------------------------------------

function hitungInfoKelahiran(tanggal: Date): InfoKelahiran {
  const cal = new SakaCalendar(new Date(tanggal));

  const noWuku = cal.getWuku(NO_WUKU) as number;
  const noSaptawara = cal.getSaptawara(NO_SAPTAWARA) as number;
  const noPancawara = cal.getPancawara(NO_PANCAWARA) as number;

  const uripS = URIP_SAPTAWARA[noSaptawara];
  const uripP = URIP_PANCAWARA[noPancawara];
  const uripG = uripS + uripP;

  const noDasa = ((uripG + 1) % 10) || 10;

  const pal =
    TABEL_PALINTANGAN[noSaptawara]?.[noPancawara - 1] ?? {
      nama: `${NAMA_SAPTAWARA[noSaptawara]} ${
        NAMA_PANCAWARA[noPancawara]
      }`,
      makna: "-",
      sifat: "-",
    };

  const wukuInfo = TABEL_WUKU[noWuku] ?? {
    dewaPelindung: "-",
    pengawak: "-",
    sifatUmum: "-",
  };

  return {
    tanggal,
    noWuku,
    namaWuku: NAMA_WUKU[noWuku] ?? "",
    noSaptawara,
    namaSaptawara: NAMA_SAPTAWARA[noSaptawara] ?? "",
    noPancawara,
    namaPancawara: NAMA_PANCAWARA[noPancawara] ?? "",
    namaOtonan: `${NAMA_SAPTAWARA[noSaptawara]} ${
      NAMA_PANCAWARA[noPancawara]
    } ${NAMA_WUKU[noWuku]}`,
    uripSaptawara: uripS,
    uripPancawara: uripP,
    uripGabungan: uripG,
    perkiraanUmur: uripG * 6,
    noDasawara: noDasa,
    namaDasawara: NAMA_DASAWARA[noDasa] ?? "",
    palintangan: pal,
    infoWuku: { nama: NAMA_WUKU[noWuku] ?? "", ...wukuInfo },
  };
}

/** Format usia ke label "X tahun Y bulan Z hari" */
function formatUsia(usiaDari: number): string {
  const tahun = Math.floor(usiaDari / 365);
  const sisa = usiaDari % 365;
  const bulan = Math.floor(sisa / 30);
  const hari = sisa % 30;

  const parts: string[] = [];
  if (tahun > 0) parts.push(`${tahun} tahun`);
  if (bulan > 0) parts.push(`${bulan} bulan`);
  if (hari > 0 || parts.length === 0) parts.push(`${hari} hari`);
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Fungsi utama: cari otonan
// ---------------------------------------------------------------------------

export function cariOtonan(
  tanggalLahir: Date,
  jumlahKedepan = 6,
  dariTanggal: Date = new Date(),
): HasilOtonan {
  const lahir = normalHari(tanggalLahir);
  const mulai = normalHari(dariTanggal);
  const kelahiran = hitungInfoKelahiran(lahir);

  const jadwal: JadwalOtonan[] = [];

  const deltaMs = mulai.getTime() - lahir.getTime();
  const deltaHari = Math.ceil(deltaMs / 86400000);

  const siklusMulai = Math.max(1, Math.ceil(deltaHari / 210));

  for (let i = 0; i < jumlahKedepan; i++) {
    const siklus = siklusMulai + i;
    const usiaDari = siklus * 210;
    const tglOtonan = new Date(lahir.getTime() + usiaDari * 86400000);

    jadwal.push({
      tanggal: tglOtonan,
      siklus,
      usiaDari,
      usiaLabel: formatUsia(usiaDari),
      isOtonanBesar: siklus % 5 === 0,
    });
  }

  const hariHidup = Math.floor(
    (mulai.getTime() - lahir.getTime()) / 86400000,
  );
  const jumlahOton = Math.floor(hariHidup / 210);

  return {
    kelahiran,
    jadwalOtonan: jadwal,
    berikutnya: jadwal[0] ?? null,
    jumlahOton,
  };
}

/**
 * Cek apakah hari ini adalah otonan dari tanggal lahir tertentu.
 */
export function isOtonanHariIni(
  tanggalLahir: Date,
  hari: Date = new Date(),
): boolean {
  const lahir = normalHari(tanggalLahir);
  const target = normalHari(hari);
  const deltaMs = target.getTime() - lahir.getTime();
  const deltaHari = Math.round(deltaMs / 86400000);
  return deltaHari > 0 && deltaHari % 210 === 0;
}

/**
 * Hitung otonan berikutnya dari tanggal lahir (satu saja).
 */
export function otonanBerikutnya(
  tanggalLahir: Date,
  dariTanggal: Date = new Date(),
): JadwalOtonan | null {
  return cariOtonan(tanggalLahir, 1, dariTanggal).jadwalOtonan[0] ?? null;
}

/**
 * Hitung semua otonan dalam rentang tahun Masehi tertentu.
 */
export function otonanDalamTahun(
  tanggalLahir: Date,
  tahun: number,
): JadwalOtonan[] {
  const mulai = new Date(tahun, 0, 1);
  const akhir = new Date(tahun, 11, 31);

  const lahir = normalHari(tanggalLahir);
  const hasil: JadwalOtonan[] = [];

  const siklusAwal = Math.max(
    1,
    Math.floor((mulai.getTime() - lahir.getTime()) / (210 * 86400000)),
  );
  const siklusAkhir =
    Math.ceil((akhir.getTime() - lahir.getTime()) / (210 * 86400000)) + 1;

  for (let s = siklusAwal; s <= siklusAkhir; s++) {
    const usiaDari = s * 210;
    const tgl = new Date(lahir.getTime() + usiaDari * 86400000);
    if (tgl.getFullYear() === tahun) {
      hasil.push({
        tanggal: tgl,
        siklus: s,
        usiaDari,
        usiaLabel: formatUsia(usiaDari),
        isOtonanBesar: s % 5 === 0,
      });
    }
  }

  return hasil;
}

// ---------------------------------------------------------------------------
// Util
// ---------------------------------------------------------------------------

function normalHari(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
