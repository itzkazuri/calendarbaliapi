// ============================================================
// SakaCalendar.ts — Kelas utama sebagai facade semua modul
// ============================================================

import { getPivot } from "./pivot";
import type { SakaCalendarPivot, SakaDate } from "./types";
import {
  getWuku,
  getSaptawara,
  getPancawara,
  getTriwara,
  getEkawara,
  getDwiwara,
  getCaturwara,
  getSadwara,
  getAstawara,
  getSangawara,
  getDasawara,
  getIngkel,
  getJejepan,
  getWatekAlit,
  getWatekMadya,
} from "./pawukon";
import {
  getEkaJalaRsi,
  getLintang,
  getPancasudha,
  getPararasan,
  getRakam,
  getZodiak,
} from "./dewasa";
import { hitungSaka } from "./saka";

// Re-export field selector constants agar mudah dipakai dari luar
export {
  NO_WUKU, ANGKA_WUKU, URIP_WUKU,
  NO_SAPTAWARA, URIP_SAPTAWARA,
  NO_PANCAWARA, URIP_PANCAWARA,
  TAHUN_SAKA, PENANGGAL, NO_SASIH, NO_NGUNARATRI,
  IS_NGUNARATRI, IS_PANGELONG, IS_NAMPIH,
} from "./types";

export class SakaCalendar {
  private readonly date: Date;
  private readonly pivot: SakaCalendarPivot;

  // Lazy-computed Saka result
  private _saka: SakaDate | null = null;

  constructor(date?: Date)
  constructor(year: number, month: number, dayOfMonth: number)
  constructor(dateOrYear?: Date | number, month?: number, dayOfMonth?: number) {
    if (dateOrYear instanceof Date) {
      this.date = new Date(dateOrYear);
    } else if (typeof dateOrYear === "number") {
      // month is 0-based like Java
      this.date = new Date(dateOrYear, month ?? 0, dayOfMonth ?? 1);
    } else {
      this.date = new Date();
    }
    this.pivot = getPivot(this.date.getTime());
  }

  // ---------- Convenience ----------

  get timestampMs(): number { return this.date.getTime(); }
  get nativeDate(): Date    { return new Date(this.date); }

  private get saka(): SakaDate {
    if (!this._saka) {
      this._saka = hitungSaka(this.date.getTime(), this.pivot, this.date);
    }
    return this._saka;
  }

  // ============================================================
  // Wuku
  // ============================================================

  getWuku(field: 0 | 1 | 2): number {
    const info = getWuku(this.timestampMs, this.pivot);
    if (field === 0) return info.noWuku;
    if (field === 1) return info.angkaWuku;
    return info.uripWuku;
  }

  /** Shorthand — kembalikan semua info wuku sekaligus */
  getWukuInfo() {
    return getWuku(this.timestampMs, this.pivot);
  }

  // ============================================================
  // Saptawara
  // ============================================================

  getSaptawara(field: 0 | 1): number {
    const info = getSaptawara(this.date);
    return field === 0 ? info.noSaptawara : info.uripSaptawara;
  }

  getSaptawaraInfo() {
    return getSaptawara(this.date);
  }

  // ============================================================
  // Pancawara
  // ============================================================

  getPancawara(field: 0 | 1): number {
    const aw = this.getWuku(1 /* ANGKA_WUKU */);
    const info = getPancawara(aw);
    return field === 0 ? info.noPancawara : info.uripPancawara;
  }

  getPancawaraInfo() {
    const aw = this.getWuku(1);
    return getPancawara(aw);
  }

  // ============================================================
  // Wewaran lainnya
  // ============================================================

  getTriwara(): number {
    return getTriwara(this.getWuku(1));
  }

  getEkawara(): number {
    return getEkawara(this.getPancawara(1), this.getSaptawara(1));
  }

  getDwiwara(): number {
    return getDwiwara(this.getPancawara(1), this.getSaptawara(1));
  }

  getCaturwara(): number {
    return getCaturwara(this.getWuku(1));
  }

  getSadwara(): number {
    return getSadwara(this.getWuku(1));
  }

  getAstawara(): number {
    return getAstawara(this.getWuku(1));
  }

  getSangawara(): number {
    return getSangawara(this.getWuku(1));
  }

  getDasawara(): number {
    return getDasawara(this.getPancawara(1), this.getSaptawara(1));
  }

  getIngkel(): number {
    return getIngkel(this.getWuku(0));
  }

  getJejepan(): number {
    return getJejepan(this.getWuku(1));
  }

  getWatekAlit(): number {
    return getWatekAlit(this.getPancawara(1), this.getSaptawara(1));
  }

  getWatekMadya(): number {
    return getWatekMadya(this.getPancawara(1), this.getSaptawara(1));
  }

  // ============================================================
  // Dewasa (Eka Jala Rsi, Lintang, dll.)
  // ============================================================

  getEkaJalaRsi(): number {
    return getEkaJalaRsi(this.getWuku(0), this.getSaptawara(0));
  }

  getLintang(): number {
    return getLintang(this.getSaptawara(0), this.getPancawara(0));
  }

  getPancasudha(): number {
    return getPancasudha(this.getSaptawara(0), this.getPancawara(0));
  }

  getPararasan(): number {
    return getPararasan(this.getSaptawara(0), this.getPancawara(0));
  }

  getRakam(): number {
    return getRakam(this.getSaptawara(0), this.getPancawara(0));
  }

  getZodiak(): number {
    return getZodiak(this.date);
  }

  // ============================================================
  // Kalender Saka
  // ============================================================

  getSakaCalendar(field: 0 | 1 | 2 | 3): number {
    const s = this.saka;
    if (field === 0) return s.tahunSaka;
    if (field === 1) return s.penanggal;
    if (field === 2) return s.noSasih;
    return s.noNgunaratri;
  }

  getSakaCalendarStatus(field: 0 | 1 | 2): boolean {
    const s = this.saka;
    if (field === 0) return s.isNgunaratri;
    if (field === 1) return s.isPangelong;
    return s.isNampih;
  }

  /** Kembalikan semua info Saka sekaligus */
  getSakaDate(): SakaDate {
    return { ...this.saka };
  }

  // ============================================================
  // toString ringkas (untuk debugging)
  // ============================================================

  toString(): string {
    const { tahunSaka, penanggal, noSasih, isPangelong, isNgunaratri, isNampih } = this.saka;
    const wuku = this.getWuku(0);
    const saptawara = this.getSaptawara(0);
    const pancawara = this.getPancawara(0);
    const ng = isNgunaratri ? ` (ngunaratri)` : "";
    const pg = isPangelong ? "Pangelong" : "Penanggal";
    const nm = isNampih ? "Nampih " : "";
    return (
      `${this.date.toDateString()} → ` +
      `Wuku ${wuku}, Saptawara ${saptawara}, Pancawara ${pancawara} | ` +
      `${pg} ${penanggal}${ng}, ${nm}Sasih ${noSasih}, Saka ${tahunSaka}`
    );
  }
}
