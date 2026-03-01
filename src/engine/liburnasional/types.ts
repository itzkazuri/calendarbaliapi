// ============================================================
// types.ts — Tipe data untuk engine hari libur nasional
// ============================================================

/** Kategori agama / sistem kalender */
export type KategoriLibur =
  | "gregorian" // Hari tetap berdasarkan kalender Masehi
  | "kristen" // Easter-based (Jumat Agung, Paskah, Kenaikan)
  | "islam" // Hijriah (Idul Fitri, Idul Adha, Maulid, Isra Mi'raj, Tahun Baru Islam)
  | "imlek" // Tionghoa Lunisolar (Tahun Baru Imlek)
  | "waisak" // Buddha (Hari Waisak)
  | "nasional" // Hari nasional non-agama (Pancasila, Kemerdekaan, Buruh)
  | "cuti_bersama"; // Ditetapkan pemerintah, inject manual

/** Jenis hari: libur resmi atau cuti bersama */
export type JenisHari = "libur" | "cuti_bersama";

/** Satu entri hari libur */
export interface HariLibur {
  tanggal: Date;
  nama: string;
  kategori: KategoriLibur;
  jenis: JenisHari;
  /** Keterangan tambahan, misal nama shio untuk Imlek */
  keterangan?: string;
}

// ---------------------------------------------------------------------------
// Hijriah
// ---------------------------------------------------------------------------

export interface TanggalHijriah {
  tahun: number; // Tahun Hijriah
  bulan: number; // 1–12
  hari: number; // 1–30
}

export type NamaBulanHijriah =
  | "Muharram"
  | "Safar"
  | "Rabi'ul Awal"
  | "Rabi'ul Akhir"
  | "Jumadil Awal"
  | "Jumadil Akhir"
  | "Rajab"
  | "Sya'ban"
  | "Ramadhan"
  | "Syawal"
  | "Dzulqa'dah"
  | "Dzulhijjah";

// ---------------------------------------------------------------------------
// Imlek / Tionghoa
// ---------------------------------------------------------------------------

export type NamaShio =
  | "Tikus"
  | "Kerbau"
  | "Macan"
  | "Kelinci"
  | "Naga"
  | "Ular"
  | "Kuda"
  | "Kambing"
  | "Monyet"
  | "Ayam"
  | "Anjing"
  | "Babi";

export type NamaElemen = "Kayu" | "Api" | "Tanah" | "Logam" | "Air";

export interface InfoImlek {
  tahunTionghoa: number;
  shio: NamaShio;
  elemen: NamaElemen;
  polaritas: "Yin" | "Yang";
  tanggalMasehi: Date;
}

// ---------------------------------------------------------------------------
// Easter
// ---------------------------------------------------------------------------

export interface InfoEaster {
  tahun: number;
  tanggalEaster: Date;
  jumatAgung: Date;
  kenaikanYesus: Date;
}

// ---------------------------------------------------------------------------
// Waisak
// ---------------------------------------------------------------------------

export interface InfoWaisak {
  tahun: number;
  tanggalWaisak: Date;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface OpsiLiburNasional {
  /** Sertakan cuti bersama dari list manual? Default: true */
  termasukCutiBersama?: boolean;
  /** Filter kategori tertentu saja */
  hanyaKategori?: KategoriLibur[];
  /** Adjustment hari untuk hari raya Islam (rukyat vs hisab). Default: 0 */
  adjustmentIslam?: number;
}
