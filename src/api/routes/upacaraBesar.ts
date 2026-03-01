import { Elysia } from "elysia";
import {
  cekTahunSaka,
  getBhataraTurunKabeh,
  getEkaDasaRudra,
  getPancaWaliKrama,
  getRingkasanUpacaraBesar,
  type InfoUpacaraBesar,
} from "../../engine/rahinanbali/upacaraBesarEngine";
import { formatISODate, parseISODate } from "../utils/date";

function mapInfo(item: InfoUpacaraBesar) {
  return {
    ...item,
    tanggalMasehi: formatISODate(item.tanggalMasehi),
  };
}

function parseYear(input: string | undefined): number | null {
  if (!input) return null;
  const year = Number(input);
  if (!Number.isInteger(year) || year < 1900 || year > 2600) return null;
  return year;
}

export const upacaraBesarRoutes = new Elysia({ name: "upacara-besar" })
  .get("/upacara-besar/ringkasan", ({ query }) => {
    const from = query.from ? parseISODate(query.from) : null;
    const base = from ?? new Date();
    const hasil = getRingkasanUpacaraBesar(base);

    return {
      ...hasil,
      bhataraTurunKabehBerikutnya: hasil.bhataraTurunKabehBerikutnya
        ? mapInfo(hasil.bhataraTurunKabehBerikutnya)
        : null,
      pancaWaliKramaBerikutnya: hasil.pancaWaliKramaBerikutnya
        ? mapInfo(hasil.pancaWaliKramaBerikutnya)
        : null,
      ekaDasaRudraBerikutnya: hasil.ekaDasaRudraBerikutnya
        ? mapInfo(hasil.ekaDasaRudraBerikutnya)
        : null,
      semua: hasil.semua.map(mapInfo),
    };
  })
  .get("/upacara-besar", ({ query, set }) => {
    const start = parseYear(query.start);
    const end = parseYear(query.end);
    if (start === null || end === null) {
      set.status = 400;
      return { error: "Parameter start dan end wajib (tahun Masehi)." };
    }

    const jenis = query.jenis?.toLowerCase();

    const list: InfoUpacaraBesar[] = [];
    if (!jenis || jenis === "bhatara") list.push(...getBhataraTurunKabeh(start, end));
    if (!jenis || jenis === "panca") list.push(...getPancaWaliKrama(start, end));
    if (!jenis || jenis === "eka") list.push(...getEkaDasaRudra(start, end));

    const data = list.sort((a, b) => a.tanggalMasehi.getTime() - b.tanggalMasehi.getTime());

    return {
      start,
      end,
      total: data.length,
      data: data.map(mapInfo),
    };
  })
  .get("/upacara-besar/cek", ({ query, set }) => {
    const tahunSaka = Number(query.tahunSaka);
    if (!Number.isFinite(tahunSaka)) {
      set.status = 400;
      return { error: "Parameter tahunSaka wajib (angka)." };
    }

    return cekTahunSaka(Math.trunc(tahunSaka));
  });
