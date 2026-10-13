import { Elysia } from "elysia";
import {
  cekTahunSaka,
  getBhataraTurunKabeh,
  getEkaDasaRudra,
  getPancaWaliKrama,
  getRingkasanUpacaraBesar,
  type InfoUpacaraBesar,
} from "../../engine/rahinanbali/upacaraBesarEngine";
import { formatISODate, parseISODate, parseYear } from "../utils/date";

function mapInfo(item: InfoUpacaraBesar) {
  return {
    ...item,
    tanggalMasehi: formatISODate(item.tanggalMasehi),
  };
}

export const upacaraBesarRoutes = new Elysia({ name: "upacara-besar" })
  .get("/upacara-besar/ringkasan", ({ query, set }) => {
    if (query.from) {
      const parsed = parseISODate(query.from, 1900, 2600);
      if (!parsed) {
        set.status = 400;
        return { error: "Format from tidak valid. Gunakan format YYYY-MM-DD." };
      }
    }
    const from = query.from ? parseISODate(query.from, 1900, 2600) : null;
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
    if (!query.start || !query.end) {
      set.status = 400;
      return { error: "Parameter start dan end wajib diisi (contoh: ?start=2020&end=2030)." };
    }

    const start = parseYear(query.start, 1900, 2600);
    const end = parseYear(query.end, 1900, 2600);
    if (start === null || end === null) {
      set.status = 400;
      return { error: "Tahun start atau end tidak valid. Masukkan rentang tahun 1900-2600." };
    }

    if (start > end) {
      set.status = 400;
      return { error: "start tidak boleh lebih besar dari end." };
    }

    if (end - start > 100) {
      set.status = 400;
      return { error: "Rentang tahun maksimal adalah 100 tahun." };
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
    if (!query.tahunSaka) {
      set.status = 400;
      return { error: "Parameter tahunSaka wajib diisi." };
    }

    const tahunSaka = Number(query.tahunSaka);
    if (!Number.isInteger(tahunSaka) || tahunSaka < 1 || tahunSaka > 3000) {
      set.status = 400;
      return { error: "Parameter tahunSaka tidak valid (masukkan angka bulat 1-3000)." };
    }

    return cekTahunSaka(tahunSaka);
  });
