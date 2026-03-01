// ============================================================
// index.ts — Barrel export semua engine & types
// ============================================================

// Types
export type {
  HariLibur,
  KategoriLibur,
  JenisHari,
  OpsiLiburNasional,
  TanggalHijriah,
  NamaBulanHijriah,
  NamaShio,
  NamaElemen,
  InfoImlek,
  InfoEaster,
  InfoWaisak,
} from "./types";

// Facade utama
export {
  getLiburNasional,
  cekLiburNasional,
  isHariLibur,
  liburBerikutnya,
  getLiburPerKategori,
  hitungHariKerja,
} from "./Liburnasional";

// Engine Gregorian
export { getLiburGregorian } from "./GregorianEngine";

// Engine Kristen (Easter)
export { hitungEaster, getInfoEaster, getLiburKristen } from "./EasterEngine";

// Engine Islam (Hijriah)
export {
  hijriToGregorian,
  gregorianToHijri,
  getLiburIslam,
  formatHijriah,
  NAMA_BULAN_HIJRIAH,
} from "./HijriahEngine";

// Engine Imlek (Tionghoa)
export {
  getShio,
  getElemen,
  getPolaritas,
  getTahunTionghoa,
  getTiangan,
  getDizhi,
  getTanggalImlek,
  getInfoImlek,
  getLiburImlek,
  DAFTAR_SHIO,
  DAFTAR_ELEMEN,
  TIANGAN,
  DIZHI,
  KARAKTER_SHIO,
  KARAKTER_ELEMEN,
} from "./ImlekEngine";

// Engine Waisak
export {
  getTanggalWaisak,
  getInfoWaisak,
  getLiburWaisak,
} from "./WaisakEngine";

// Cuti Bersama
export {
  getCutiBersama,
  injectCutiBersama,
  tambahCutiBersama,
  resetInjectedCuti,
  adaDataCuti,
  getTahunTersedia,
} from "./Cutibersamaengine";
