// ============================================================
// upacaraBesarEngine.ts — Engine Prediksi Upacara Besar Bali
// ============================================================

import { SakaCalendar } from "./SakaCalendar";
import { NAMA_SASIH } from "./names";
import { cariPurnamaTilem } from "./purnamaTilem";

export type JenisUpacaraBesar =
  | "bhatara_turun_kabeh"
  | "panca_wali_krama"
  | "eka_dasa_rudra";

export interface InfoUpacaraBesar {
  jenis: JenisUpacaraBesar;
  nama: string;
  namaAlternatif?: string;
  deskripsi: string;
  tanggalMasehi: Date;
  tahunSaka: number;
  makna: string;
  periodeTahun: number;
  isBerikutnya: boolean;
}

function masehiToSaka(tahunMasehi: number): number {
  return tahunMasehi - 78;
}

function sakaToMasehiPerkiraan(tahunSaka: number): number {
  return tahunSaka + 78;
}

function cariTilemKasanga(tahunSaka: number): Date | null {
  const tahunMasehi = sakaToMasehiPerkiraan(tahunSaka);

  const mulai = new Date(tahunMasehi - 1, 11, 1);
  const akhir = new Date(tahunMasehi + 1, 4, 31);

  const tilem = cariPurnamaTilem(mulai, akhir, { jenis: "tilem" });

  for (const t of tilem) {
    const cal = new SakaCalendar(t.date);
    const saka = cal.getSakaDate();
    if (saka.noSasih === 9) {
      const selisih = Math.abs(saka.tahunSaka - tahunSaka);
      if (selisih <= 1) return t.date;
    }
  }
  return null;
}

function cariPurnamaKadasa(tahunSaka: number): Date | null {
  const tahunMasehi = sakaToMasehiPerkiraan(tahunSaka);

  const mulai = new Date(tahunMasehi, 1, 1);
  const akhir = new Date(tahunMasehi, 7, 31);

  const purnama = cariPurnamaTilem(mulai, akhir, { jenis: "purnama" });

  for (const p of purnama) {
    const cal = new SakaCalendar(p.date);
    const saka = cal.getSakaDate();
    if (saka.noSasih === 10) {
      const selisih = Math.abs(saka.tahunSaka - tahunSaka);
      if (selisih <= 1) return p.date;
    }
  }
  return null;
}

export function getBhataraTurunKabeh(
  tahunMasehiMulai: number,
  tahunMasehiAkhir: number,
): InfoUpacaraBesar[] {
  const hasil: InfoUpacaraBesar[] = [];
  const hariIni = new Date();

  for (let t = tahunMasehiMulai; t <= tahunMasehiAkhir; t += 1) {
    const tahunSaka = masehiToSaka(t);
    const tgl = cariPurnamaKadasa(tahunSaka);
    if (!tgl) continue;

    hasil.push({
      jenis: "bhatara_turun_kabeh",
      nama: "Bhatara Turun Kabeh",
      namaAlternatif: "Piodalan Agung Besakih",
      deskripsi:
        "Upacara tahunan di Pura Agung Besakih — semua dewa turun ke bumi pada Purnama Kadasa",
      tanggalMasehi: tgl,
      tahunSaka,
      makna:
        "Momentum terbesar pemujaan Ida Sang Hyang Widi Wasa bagi seluruh umat Hindu Bali di Pura Agung Besakih",
      periodeTahun: 1,
      isBerikutnya: tgl >= hariIni,
    });
  }

  return hasil;
}

export function getPancaWaliKrama(
  tahunMasehiMulai: number,
  tahunMasehiAkhir: number,
): InfoUpacaraBesar[] {
  const hasil: InfoUpacaraBesar[] = [];
  const hariIni = new Date();

  const sakaMulai = masehiToSaka(tahunMasehiMulai);
  const sakaAkhir = masehiToSaka(tahunMasehiAkhir);
  const sakaPertama = Math.ceil(sakaMulai / 10) * 10;

  for (let saka = sakaPertama; saka <= sakaAkhir; saka += 10) {
    if (saka % 100 === 0) continue;

    const tgl = cariTilemKasanga(saka);
    if (!tgl) continue;

    hasil.push({
      jenis: "panca_wali_krama",
      nama: "Panca Wali Krama",
      deskripsi: `Upacara 10 tahunan di Pura Agung Besakih — Tilem Kasanga Saka ${saka}`,
      tanggalMasehi: tgl,
      tahunSaka: saka,
      makna:
        "Upacara pembersihan dan penyucian jagat raya setiap 10 tahun, memohon keselamatan alam semesta beserta isinya kepada Ida Sang Hyang Widi",
      periodeTahun: 10,
      isBerikutnya: tgl >= hariIni,
    });
  }

  return hasil;
}

export function getEkaDasaRudra(
  tahunMasehiMulai: number,
  tahunMasehiAkhir: number,
): InfoUpacaraBesar[] {
  const hasil: InfoUpacaraBesar[] = [];
  const hariIni = new Date();

  const sakaMulai = masehiToSaka(tahunMasehiMulai);
  const sakaAkhir = masehiToSaka(tahunMasehiAkhir);
  const sakaPertama = Math.ceil(sakaMulai / 100) * 100;

  for (let saka = sakaPertama; saka <= sakaAkhir; saka += 100) {
    const tgl = cariTilemKasanga(saka);
    if (!tgl) continue;

    hasil.push({
      jenis: "eka_dasa_rudra",
      nama: "Eka Dasa Rudra",
      namaAlternatif: "Rah Windu Tenggek Windu",
      deskripsi: `Upacara paling agung 100 tahunan di Pura Agung Besakih — Saka ${saka} (≈${tgl.getFullYear()} M)`,
      tanggalMasehi: tgl,
      tahunSaka: saka,
      makna:
        "Upacara terbesar dan paling sakral dalam tradisi Hindu Bali. Dilaksanakan saat tahun Saka mencapai nilai rah windu tenggek windu. Terakhir: 1979 M (Saka 1900). Berikutnya: ~2078 M (Saka 2000).",
      periodeTahun: 100,
      isBerikutnya: tgl >= hariIni,
    });
  }

  return hasil;
}

export interface RingkasanUpacaraBesar {
  tahunSakaSaatIni: number;
  tahunMasehiSaatIni: number;
  bhataraTurunKabehBerikutnya: InfoUpacaraBesar | null;
  pancaWaliKramaBerikutnya: InfoUpacaraBesar | null;
  ekaDasaRudraBerikutnya: InfoUpacaraBesar | null;
  tahunLagiPancaWali: number | null;
  tahunLagiEkaDasa: number | null;
  semua: InfoUpacaraBesar[];
}

export function getRingkasanUpacaraBesar(
  dari: Date = new Date(),
): RingkasanUpacaraBesar {
  const tahunNow = dari.getFullYear();
  const sakaNow = masehiToSaka(tahunNow);
  const akhir = tahunNow + 200;

  const edr = getEkaDasaRudra(tahunNow, akhir);
  const pwk = getPancaWaliKrama(tahunNow, akhir);
  const btk = getBhataraTurunKabeh(tahunNow, tahunNow + 5);

  const edrBerikutnya = edr.find((e) => e.tanggalMasehi >= dari) ?? null;
  const pwkBerikutnya = pwk.find((p) => p.tanggalMasehi >= dari) ?? null;
  const btkBerikutnya = btk.find((b) => b.tanggalMasehi >= dari) ?? null;

  const semua = [...edr, ...pwk, ...btk].sort(
    (a, b) => a.tanggalMasehi.getTime() - b.tanggalMasehi.getTime(),
  );

  return {
    tahunSakaSaatIni: sakaNow,
    tahunMasehiSaatIni: tahunNow,
    bhataraTurunKabehBerikutnya: btkBerikutnya,
    pancaWaliKramaBerikutnya: pwkBerikutnya,
    ekaDasaRudraBerikutnya: edrBerikutnya,
    tahunLagiPancaWali: pwkBerikutnya
      ? pwkBerikutnya.tanggalMasehi.getFullYear() - tahunNow
      : null,
    tahunLagiEkaDasa: edrBerikutnya
      ? edrBerikutnya.tanggalMasehi.getFullYear() - tahunNow
      : null,
    semua,
  };
}

export function cekTahunSaka(tahunSaka: number): {
  isEkaDasaRudra: boolean;
  isPancaWaliKrama: boolean;
  isBhataraTurunKabeh: boolean;
  deskripsi: string;
} {
  const isEDR = tahunSaka % 100 === 0;
  const isPWK = tahunSaka % 10 === 0 && !isEDR;
  const isBTK = true;

  let deskripsi = `Saka ${tahunSaka}`;
  if (isEDR) deskripsi += " — EKA DASA RUDRA (100 tahunan)";
  else if (isPWK) deskripsi += " — PANCA WALI KRAMA (10 tahunan)";
  else deskripsi += " — Bhatara Turun Kabeh (tahunan)";

  return {
    isEkaDasaRudra: isEDR,
    isPancaWaliKrama: isPWK,
    isBhataraTurunKabeh: isBTK,
    deskripsi,
  };
}

export function getSasihInfoForUpacara(
  date: Date,
): { tahunSaka: number; noSasih: number; namaSasih: string } {
  const cal = new SakaCalendar(date);
  const saka = cal.getSakaDate();
  return {
    tahunSaka: saka.tahunSaka,
    noSasih: saka.noSasih,
    namaSasih: NAMA_SASIH[saka.noSasih] ?? "",
  };
}
