// ============================================================
// dewasaAyuEngine.ts — Engine Ayuning Dewasa (Hari Baik/Buruk Bali)
// ============================================================

import { SakaCalendar } from "./SakaCalendar";
import { NO_WUKU, NO_SAPTAWARA, NO_PANCAWARA } from "./types";
import {
  NAMA_WUKU,
  NAMA_SAPTAWARA,
  NAMA_PANCAWARA,
  NAMA_TRIWARA,
  NAMA_SADWARA,
  NAMA_ASTAWARA,
  NAMA_SANGAWARA,
  NAMA_DASAWARA,
  NAMA_INGKEL,
  NAMA_JEJEPAN,
  NAMA_LINTANG,
  NAMA_EKA_JALA_RSI,
  NAMA_PANCASUDHA,
  NAMA_PARARASAN,
  NAMA_RAKAM,
  NAMA_SASIH,
} from "./names";
import {
  getEkaJalaRsi,
  getLintang,
  getPancasudha,
  getPararasan,
  getRakam,
} from "./dewasa";

export type SkorHari = "amat_baik" | "baik" | "cukup" | "kurang_baik" | "buruk";

export type JenisUpacara =
  | "umum"
  | "pernikahan"
  | "ngaben"
  | "metatah"
  | "bangun_rumah"
  | "mulai_usaha"
  | "tanam"
  | "melaut"
  | "odalan"
  | "ngotonin"
  | "mapandes";

export interface FaktorDewasa {
  nama: string;
  deskripsi: string;
  bobot: number;
}

export interface PantanganHari {
  sistem: string;
  pantangan: string;
  berlaku: string;
}

export interface RekomendasiUpacara {
  jenis: JenisUpacara;
  cocok: boolean;
  alasan: string;
}

export interface HasilDewasaAyu {
  tanggal: Date;

  namaSaptawara: string;
  namaPancawara: string;
  namaWuku: string;
  namaTriwara: string;
  namaSasih: string;
  penanggal: number;
  isPangelong: boolean;

  namaLintang: string;
  namaEkaJalaRsi: string;
  namaPancasudha: string;
  namaPararasan: string;
  namaRakam: string;
  namaIngkel: string;
  namaJejepan: string;
  namaAstawara: string;
  namaSangawara: string;
  namaDasawara: string;

  skor: SkorHari;
  skorAngka: number;
  faktorAyu: FaktorDewasa[];
  faktorAla: FaktorDewasa[];
  pantangan: PantanganHari[];
  rekomendasi: RekomendasiUpacara[];
  ringkasan: string;
}

const EJR_AYU = new Set([8, 11, 13, 14, 15, 16, 17, 18, 20, 21, 22, 23, 24, 25, 27, 28]);
const EJR_ALA = new Set([1, 2, 3, 4, 5, 6, 7, 9, 10, 12, 19, 26]);

const WUKU_RANGDA_TIGA = new Set([7, 8, 15, 16, 24, 25]);
const WUKU_PANTANG_PERNIKAHAN = new Set([2, 7, 8, 11, 15, 16, 24, 25, 27]);
const WUKU_BAIK_NGABEN = new Set([1, 3, 5, 9, 12, 14, 17, 20, 22, 26, 28, 30]);

const LINTANG_AYU = new Set([1, 2, 7, 8, 10, 18, 30, 32, 33]);
const LINTANG_ALA = new Set([12, 15, 17, 25, 27, 28]);

const PANCASUDHA_BOBOT: Record<number, number> = {
  1: 20, 2: 15, 3: 12, 4: 10, 5: 0, 6: -12, 7: -18,
};

const PARARASAN_BOBOT: Record<number, number> = {
  1: 10, 2: 10, 3: 0, 4: 15, 5: -5, 6: 5, 7: 12, 8: 12, 9: 12, 10: 5, 11: 8, 12: -10,
};

const RAKAM_BOBOT: Record<number, number> = {
  1: -15, 2: 5, 3: 15, 4: 12, 5: 8, 6: -20,
};

const SANGAWARA_BOBOT: Record<number, number> = {
  1: 0, 2: 5, 3: -8, 4: 3, 5: 3, 6: 5, 7: -10, 8: 15, 9: 15,
};

const INGKEL_PANTANGAN: Record<number, string> = {
  1: "Pernikahan, khitanan, dan hajatan yang melibatkan banyak orang (berpotensi konflik)",
  2: "Menyembelih hewan ternak dan berburu",
  3: "Melaut, memancing, dan usaha perikanan",
  4: "Memelihara unggas baru, bercocok tanam unggas",
  5: "Menebang pohon besar, membangun dari kayu",
  6: "Membangun dengan bambu, upacara yang menggunakan bambu",
};

const ASTAWARA_BOBOT: Record<number, number> = {
  1: 15, 2: 12, 3: 15, 4: -5, 5: -12, 6: 8, 7: -15, 8: 10,
};

const DASAWARA_BOBOT: Record<number, number> = {
  1: 15, 2: -15, 3: 12, 4: -12, 5: 10, 6: 0, 7: 5, 8: 12, 9: 15, 10: -15,
};

const SASIH_BOBOT: Record<number, number> = {
  1: 5, 2: 5, 3: 8, 4: 15, 5: 15, 6: 8, 7: -5, 8: -5, 9: -10, 10: 15, 11: 12, 12: 12,
};

function faseBobot(penanggal: number, isPangelong: boolean): number {
  if (!isPangelong) {
    if (penanggal <= 5) return 15;
    if (penanggal <= 10) return 10;
    return 5;
  }

  if (penanggal <= 5) return -5;
  if (penanggal <= 10) return -8;
  return -12;
}

export function hitungDewasaAyu(
  tanggal: Date,
  konteks: JenisUpacara = "umum",
): HasilDewasaAyu {
  const cal = new SakaCalendar(new Date(tanggal));
  const saka = cal.getSakaDate();

  const noWuku = cal.getWuku(NO_WUKU);
  const noSaptawara = cal.getSaptawara(NO_SAPTAWARA);
  const noPancawara = cal.getPancawara(NO_PANCAWARA);
  const noTriwara = cal.getTriwara();
  const noSadwara = cal.getSadwara();
  const noAstawara = cal.getAstawara();
  const noSangawara = cal.getSangawara();
  const noDasawara = cal.getDasawara();
  const noIngkel = cal.getIngkel();
  const noJejepan = cal.getJejepan();

  const noEJR = getEkaJalaRsi(noWuku, noSaptawara);
  const noLintang = getLintang(noSaptawara, noPancawara);
  const noPancasudha = getPancasudha(noSaptawara, noPancawara);
  const noPararasan = getPararasan(noSaptawara, noPancawara);
  const noRakam = getRakam(noSaptawara, noPancawara);

  const faktorAyu: FaktorDewasa[] = [];
  const faktorAla: FaktorDewasa[] = [];
  const pantangan: PantanganHari[] = [];

  let skorAngka = 0;

  if (EJR_AYU.has(noEJR)) {
    const b = 12;
    faktorAyu.push({
      nama: `EJR: ${NAMA_EKA_JALA_RSI[noEJR]}`,
      deskripsi: "Eka Jala Rsi memberikan pengaruh positif",
      bobot: b,
    });
    skorAngka += b;
  } else if (EJR_ALA.has(noEJR)) {
    const b = -12;
    faktorAla.push({
      nama: `EJR: ${NAMA_EKA_JALA_RSI[noEJR]}`,
      deskripsi: "Eka Jala Rsi kurang menguntungkan",
      bobot: b,
    });
    skorAngka += b;
  }

  if (LINTANG_AYU.has(noLintang)) {
    const b = 10;
    faktorAyu.push({
      nama: `Lintang ${NAMA_LINTANG[noLintang]}`,
      deskripsi: "Lintang membawa keberuntungan",
      bobot: b,
    });
    skorAngka += b;
  } else if (LINTANG_ALA.has(noLintang)) {
    const b = -10;
    faktorAla.push({
      nama: `Lintang ${NAMA_LINTANG[noLintang]}`,
      deskripsi: "Lintang ini kurang baik untuk kegiatan penting",
      bobot: b,
    });
    skorAngka += b;
    pantangan.push({
      sistem: "Lintang",
      pantangan: "Upacara besar, perjalanan jauh",
      berlaku: `Lintang ${NAMA_LINTANG[noLintang]}`,
    });
  }

  const psBobot = PANCASUDHA_BOBOT[noPancasudha] ?? 0;
  skorAngka += psBobot;
  if (psBobot > 0) {
    faktorAyu.push({
      nama: `Panca Sudha: ${NAMA_PANCASUDHA[noPancasudha]}`,
      deskripsi: "Panca Sudha membawa keberuntungan dan kemakmuran",
      bobot: psBobot,
    });
  } else if (psBobot < 0) {
    faktorAla.push({
      nama: `Panca Sudha: ${NAMA_PANCASUDHA[noPancasudha]}`,
      deskripsi: "Panca Sudha kurang menguntungkan",
      bobot: psBobot,
    });
    pantangan.push({
      sistem: "Panca Sudha",
      pantangan: "Memulai proyek besar, pernikahan",
      berlaku: NAMA_PANCASUDHA[noPancasudha] ?? "",
    });
  }

  const parBobot = PARARASAN_BOBOT[noPararasan] ?? 0;
  skorAngka += parBobot;
  if (parBobot >= 10) {
    faktorAyu.push({
      nama: `Pararasan: ${NAMA_PARARASAN[noPararasan]}`,
      deskripsi: "Pararasan sangat mendukung kegiatan hari ini",
      bobot: parBobot,
    });
  } else if (parBobot < 0) {
    faktorAla.push({
      nama: `Pararasan: ${NAMA_PARARASAN[noPararasan]}`,
      deskripsi: "Pararasan kurang mendukung",
      bobot: parBobot,
    });
  }

  const rakBobot = RAKAM_BOBOT[noRakam] ?? 0;
  skorAngka += rakBobot;
  if (rakBobot > 0) {
    faktorAyu.push({
      nama: `Rakam: ${NAMA_RAKAM[noRakam]}`,
      deskripsi: "Rakam memberikan pengaruh menguntungkan",
      bobot: rakBobot,
    });
  } else if (rakBobot < 0) {
    faktorAla.push({
      nama: `Rakam: ${NAMA_RAKAM[noRakam]}`,
      deskripsi: `Rakam ${NAMA_RAKAM[noRakam]} membawa halangan`,
      bobot: rakBobot,
    });
    if (noRakam === 6) {
      pantangan.push({
        sistem: "Rakam",
        pantangan: "Semua kegiatan penting — hindari hari ini",
        berlaku: "Nuju Pati",
      });
    }
    if (noRakam === 1) {
      pantangan.push({
        sistem: "Rakam",
        pantangan: "Pernikahan dan pesta",
        berlaku: "Kala Tinatang",
      });
    }
  }

  const sangBobot = SANGAWARA_BOBOT[noSangawara] ?? 0;
  skorAngka += sangBobot;
  if (sangBobot > 0) {
    faktorAyu.push({
      nama: `Sangawara: ${NAMA_SANGAWARA[noSangawara]}`,
      deskripsi: "Sangawara mendukung kelancaran",
      bobot: sangBobot,
    });
  } else if (sangBobot < 0) {
    faktorAla.push({
      nama: `Sangawara: ${NAMA_SANGAWARA[noSangawara]}`,
      deskripsi: "Sangawara kurang lancar",
      bobot: sangBobot,
    });
    if (noSangawara === 7) {
      pantangan.push({
        sistem: "Sangawara",
        pantangan: "Memulai usaha baru — cenderung urungan/batal",
        berlaku: "Urungan",
      });
    }
  }

  const dasBobot = DASAWARA_BOBOT[noDasawara] ?? 0;
  skorAngka += dasBobot;
  if (dasBobot >= 10) {
    faktorAyu.push({
      nama: `Dasawara: ${NAMA_DASAWARA[noDasawara]}`,
      deskripsi: "Dasawara sangat baik hari ini",
      bobot: dasBobot,
    });
  } else if (dasBobot < 0) {
    faktorAla.push({
      nama: `Dasawara: ${NAMA_DASAWARA[noDasawara]}`,
      deskripsi: "Dasawara kurang menguntungkan",
      bobot: dasBobot,
    });
    if (noDasawara === 2) {
      pantangan.push({
        sistem: "Dasawara",
        pantangan: "Semua upacara besar — Pati tidak baik untuk mulai",
        berlaku: "Pati",
      });
    }
    if (noDasawara === 4) {
      pantangan.push({
        sistem: "Dasawara",
        pantangan: "Hajatan dan perayaan — Duka tidak menyenangkan",
        berlaku: "Duka",
      });
    }
  }

  const astaBobot = ASTAWARA_BOBOT[noAstawara] ?? 0;
  skorAngka += astaBobot;
  if (astaBobot >= 10) {
    faktorAyu.push({
      nama: `Astawara: ${NAMA_ASTAWARA[noAstawara]}`,
      deskripsi: `${NAMA_ASTAWARA[noAstawara]} melindungi dan memberkati`,
      bobot: astaBobot,
    });
  } else if (astaBobot < 0) {
    faktorAla.push({
      nama: `Astawara: ${NAMA_ASTAWARA[noAstawara]}`,
      deskripsi: `${NAMA_ASTAWARA[noAstawara]} membawa tantangan`,
      bobot: astaBobot,
    });
    if (noAstawara === 7) {
      pantangan.push({
        sistem: "Astawara",
        pantangan: "Semua upacara besar — Kala hari paling berat",
        berlaku: "Kala",
      });
    }
    if (noAstawara === 5) {
      pantangan.push({
        sistem: "Astawara",
        pantangan: "Pernikahan dan kelahiran — Ludra membawa perubahan keras",
        berlaku: "Ludra",
      });
    }
  }

  if (WUKU_RANGDA_TIGA.has(noWuku)) {
    const b = -15;
    faktorAla.push({
      nama: `Wuku Rangda Tiga: ${NAMA_WUKU[noWuku]}`,
      deskripsi: "Wuku ini tergolong berat untuk upacara besar",
      bobot: b,
    });
    skorAngka += b;
    pantangan.push({
      sistem: "Wuku",
      pantangan: "Upacara kematian massal, pernikahan besar",
      berlaku: `Wuku ${NAMA_WUKU[noWuku]} (Rangda Tiga)`,
    });
  }

  if (noIngkel > 0) {
    const pantIngkel = INGKEL_PANTANGAN[noIngkel];
    if (pantIngkel) {
      pantangan.push({
        sistem: "Ingkel",
        pantangan: pantIngkel,
        berlaku: `Ingkel ${NAMA_INGKEL[noIngkel]}`,
      });
    }
  }

  const sasihBobot = SASIH_BOBOT[saka.noSasih] ?? 0;
  skorAngka += sasihBobot;
  if (sasihBobot > 0) {
    faktorAyu.push({
      nama: `Sasih ${NAMA_SASIH[saka.noSasih]}`,
      deskripsi: "Sasih ini tergolong baik untuk upacara",
      bobot: sasihBobot,
    });
  } else if (sasihBobot < 0) {
    faktorAla.push({
      nama: `Sasih ${NAMA_SASIH[saka.noSasih]}`,
      deskripsi: "Sasih ini perlu kehati-hatian",
      bobot: sasihBobot,
    });
    if (saka.noSasih === 9) {
      pantangan.push({
        sistem: "Sasih",
        pantangan: "Kasanga — bulan Nyepi, hindari semua upacara kecuali bhuta yadnya",
        berlaku: "Sasih Kasanga",
      });
    }
  }

  const faseB = faseBobot(saka.penanggal, saka.isPangelong);
  skorAngka += faseB;
  if (faseB > 0 && !saka.isPangelong) {
    faktorAyu.push({
      nama: `Fase Terang Penanggal ${saka.penanggal}`,
      deskripsi: "Fase bulan terang (sukla paksa) mendukung aktivitas positif",
      bobot: faseB,
    });
  } else if (faseB < 0 && saka.isPangelong) {
    if (konteks === "ngaben") {
      faktorAyu.push({
        nama: `Fase Gelap Pangelong ${saka.penanggal}`,
        deskripsi: "Fase gelap (krsna paksa) tepat untuk upacara pelepasan",
        bobot: Math.abs(faseB),
      });
      skorAngka += Math.abs(faseB) * 2;
    } else {
      faktorAla.push({
        nama: `Fase Gelap Pangelong ${saka.penanggal}`,
        deskripsi: "Fase bulan gelap kurang ideal untuk hajatan",
        bobot: faseB,
      });
    }
  }

  const rekomendasi = hitungRekomendasi(
    noWuku,
    noSaptawara,
    noPancawara,
    noAstawara,
    noRakam,
    noDasawara,
    saka.noSasih,
    saka.isPangelong,
    noLintang,
    noPancasudha,
  );

  const skorNorm = Math.max(-100, Math.min(100, skorAngka));

  let skor: SkorHari;
  if (skorNorm >= 50) skor = "amat_baik";
  else if (skorNorm >= 20) skor = "baik";
  else if (skorNorm >= -10) skor = "cukup";
  else if (skorNorm >= -30) skor = "kurang_baik";
  else skor = "buruk";

  const ringkasan = buatRingkasan(
    skor,
    faktorAyu,
    faktorAla,
    pantangan,
    noWuku,
    konteks,
  );

  return {
    tanggal,
    namaSaptawara: NAMA_SAPTAWARA[noSaptawara] ?? "",
    namaPancawara: NAMA_PANCAWARA[noPancawara] ?? "",
    namaWuku: NAMA_WUKU[noWuku] ?? "",
    namaTriwara: NAMA_TRIWARA[noTriwara] ?? "",
    namaSasih: NAMA_SASIH[saka.noSasih] ?? "",
    penanggal: saka.penanggal,
    isPangelong: saka.isPangelong,

    namaLintang: NAMA_LINTANG[noLintang] ?? "",
    namaEkaJalaRsi: NAMA_EKA_JALA_RSI[noEJR] ?? "",
    namaPancasudha: NAMA_PANCASUDHA[noPancasudha] ?? "",
    namaPararasan: NAMA_PARARASAN[noPararasan] ?? "",
    namaRakam: NAMA_RAKAM[noRakam] ?? "",
    namaIngkel: NAMA_INGKEL[noIngkel] ?? "",
    namaJejepan: NAMA_JEJEPAN[noJejepan] ?? "",
    namaAstawara: NAMA_ASTAWARA[noAstawara] ?? "",
    namaSangawara: NAMA_SANGAWARA[noSangawara] ?? "",
    namaDasawara: NAMA_DASAWARA[noDasawara] ?? "",

    skor,
    skorAngka: skorNorm,
    faktorAyu,
    faktorAla,
    pantangan,
    rekomendasi,
    ringkasan,
  };
}

function hitungRekomendasi(
  noWuku: number,
  noSaptawara: number,
  noPancawara: number,
  noAstawara: number,
  noRakam: number,
  noDasawara: number,
  noSasih: number,
  isPangelong: boolean,
  noLintang: number,
  noPancasudha: number,
): RekomendasiUpacara[] {
  const hasil: RekomendasiUpacara[] = [];

  const cocokPernikahan =
    !WUKU_PANTANG_PERNIKAHAN.has(noWuku) &&
    noRakam !== 6 &&
    noRakam !== 1 &&
    noDasawara !== 2 &&
    noDasawara !== 4 &&
    noAstawara !== 7 &&
    noAstawara !== 5 &&
    !isPangelong &&
    [4, 5, 10, 11, 12].includes(noSasih);
  hasil.push({
    jenis: "pernikahan",
    cocok: cocokPernikahan,
    alasan: cocokPernikahan
      ? `Wuku ${NAMA_WUKU[noWuku]} di Sasih ${NAMA_SASIH[noSasih]}, fase terang — kondusif untuk wiwaha`
      : `Terdapat pantangan: Wuku ${NAMA_WUKU[noWuku]}, atau Rakam/Dasawara/Astawara kurang ayu`,
  });

  const cocokNgaben =
    WUKU_BAIK_NGABEN.has(noWuku) &&
    noRakam !== 6 &&
    noDasawara !== 2 &&
    noSasih !== 9;
  hasil.push({
    jenis: "ngaben",
    cocok: cocokNgaben,
    alasan: cocokNgaben
      ? `Wuku ${NAMA_WUKU[noWuku]} dengan kondisi mendukung upacara palebon`
      : "Wuku atau kondisi hari ini kurang tepat untuk ngaben",
  });

  const cocokBangun =
    (noRakam === 3 || noRakam === 4 || noPancasudha === 1 || noPancasudha === 2 || noPancasudha === 3) &&
    noRakam !== 6 &&
    noAstawara !== 7;
  hasil.push({
    jenis: "bangun_rumah",
    cocok: cocokBangun,
    alasan: cocokBangun
      ? `Rakam ${NAMA_RAKAM[noRakam]} dan Panca Sudha kondusif untuk memulai pembangunan`
      : "Kondisi hari ini kurang ideal untuk memulai pembangunan",
  });

  const cocokUsaha =
    noAstawara !== 7 &&
    noAstawara !== 5 &&
    noRakam !== 6 &&
    noRakam !== 1 &&
    noDasawara !== 2 &&
    noPancasudha !== 6 &&
    noPancasudha !== 7;
  hasil.push({
    jenis: "mulai_usaha",
    cocok: cocokUsaha,
    alasan: cocokUsaha
      ? "Kombinasi hari mendukung untuk memulai usaha baru"
      : "Ada potensi hambatan — tunda atau lakukan persiapan lebih matang",
  });

  const cocokTanam = noPancasudha !== 7 && noRakam !== 6 && noAstawara !== 7;
  hasil.push({
    jenis: "tanam",
    cocok: cocokTanam,
    alasan: cocokTanam
      ? "Kondisi hari mendukung kegiatan pertanian"
      : "Kurang ideal untuk menanam hari ini",
  });

  const cocokMelaut =
    noPancasudha !== 7 &&
    noPancasudha !== 6 &&
    !LINTANG_ALA.has(noLintang) &&
    noRakam !== 6;
  hasil.push({
    jenis: "melaut",
    cocok: cocokMelaut,
    alasan: cocokMelaut
      ? "Lintang dan kondisi hari aman untuk melaut"
      : "Lintang atau kondisi hari kurang aman untuk pergi ke laut",
  });

  return hasil;
}

function buatRingkasan(
  skor: SkorHari,
  faktorAyu: FaktorDewasa[],
  faktorAla: FaktorDewasa[],
  pantangan: PantanganHari[],
  noWuku: number,
  konteks: JenisUpacara,
): string {
  const label: Record<SkorHari, string> = {
    amat_baik: "Hari ini sangat baik (Dewasa Amat Ayu)",
    baik: "Hari ini baik (Dewasa Ayu)",
    cukup: "Hari ini cukup (Dewasa Madya)",
    kurang_baik: "Hari ini kurang baik (Dewasa Ala)",
    buruk: "Hari ini buruk (Dewasa Amat Ala)",
  };

  let s = `${label[skor]} — Wuku ${NAMA_WUKU[noWuku]}. `;
  if (faktorAyu.length > 0) {
    s += `Faktor positif: ${faktorAyu.map((f) => f.nama).join(", ")}. `;
  }
  if (faktorAla.length > 0) {
    s += `Faktor negatif: ${faktorAla.map((f) => f.nama).join(", ")}. `;
  }
  if (pantangan.length > 0) {
    s += `Pantangan: ${pantangan.map((p) => p.pantangan).join("; ")}.`;
  }
  return s;
}

export function cariHariTerbaik(
  mulai: Date,
  akhir: Date,
  konteks: JenisUpacara = "umum",
  topN = 5,
): HasilDewasaAyu[] {
  const hasil: HasilDewasaAyu[] = [];
  const cursor = new Date(mulai.getFullYear(), mulai.getMonth(), mulai.getDate());

  while (cursor <= akhir) {
    const dewasa = hitungDewasaAyu(new Date(cursor), konteks);
    if (dewasa.skor === "amat_baik" || dewasa.skor === "baik") {
      hasil.push(dewasa);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  hasil.sort((a, b) => b.skorAngka - a.skorAngka);
  return hasil.slice(0, topN);
}

export function cariHariTerbaikBerikutnya(
  dari: Date = new Date(),
  hariKedepan = 30,
  konteks: JenisUpacara = "umum",
  topN = 3,
): HasilDewasaAyu[] {
  const akhir = new Date(dari);
  akhir.setDate(akhir.getDate() + hariKedepan);
  return cariHariTerbaik(dari, akhir, konteks, topN);
}
