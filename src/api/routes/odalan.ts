import { Elysia } from "elysia";
import {
  PURA_PRESET,
  buatPuraSasih,
  buatPuraWuku,
  hitungBanyakOdalan,
  hitungOdalan,
  isOdalanHariIni,
  type ProfilPura,
  type SistemOdalan,
} from "../../engine/rahinanbali/odalanEngine";
import { formatISODate, parseISODate } from "../utils/date";

function parseCount(input: string | undefined, fallback: number): number {
  if (!input) return fallback;
  const value = Number(input);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.min(50, Math.trunc(value));
}

function findPreset(id: string): ProfilPura | null {
  return PURA_PRESET.find((p) => p.id === id) ?? null;
}

function parseOdalanDefinition(query: Record<string, string | undefined>): ProfilPura | null {
  if (query.id) {
    const preset = findPreset(query.id);
    if (preset) return preset;
  }

  const sistem = (query.sistem as SistemOdalan | undefined) ?? undefined;
  if (!sistem) return null;

  if (sistem === "wuku") {
    const noWuku = Number(query.noWuku);
    const noSaptawara = Number(query.noSaptawara);
    const noPancawara = Number(query.noPancawara);
    if (!Number.isFinite(noWuku) || !Number.isFinite(noSaptawara) || !Number.isFinite(noPancawara)) {
      return null;
    }
    return buatPuraWuku(
      query.id ?? "custom_wuku",
      query.nama ?? "Pura Custom",
      Math.trunc(noWuku),
      Math.trunc(noSaptawara),
      Math.trunc(noPancawara),
      query.lokasi,
    );
  }

  if (sistem === "sasih") {
    const noSasih = Number(query.noSasih);
    const isPurnama = query.isPurnama ? query.isPurnama.toLowerCase() !== "false" : true;
    const offsetHari = query.offsetHari ? Number(query.offsetHari) : 0;
    if (!Number.isFinite(noSasih)) return null;
    return buatPuraSasih(
      query.id ?? "custom_sasih",
      query.nama ?? "Pura Custom",
      Math.trunc(noSasih),
      isPurnama,
      query.lokasi,
      Number.isFinite(offsetHari) ? Math.trunc(offsetHari) : 0,
    );
  }

  return null;
}

function mapJadwal(jadwal: ReturnType<typeof hitungOdalan>["jadwalMendatang"]) {
  return jadwal.map((j) => ({
    tanggal: formatISODate(j.tanggal),
    siklus: j.siklus,
    namaHari: j.namaHari,
    keterangan: j.keterangan,
    isOdalanBesar: j.isOdalanBesar,
  }));
}

export const odalanRoutes = new Elysia({ name: "odalan" })
  .get("/odalan/presets", () => ({
    total: PURA_PRESET.length,
    data: PURA_PRESET,
  }))
  .get("/odalan", ({ query, set }) => {
    const pura = parseOdalanDefinition(query);
    if (!pura) {
      set.status = 400;
      return { error: "Parameter odalan tidak lengkap. Gunakan id preset atau sistem wuku/sasih." };
    }

    const from = query.from ? parseISODate(query.from) : null;
    if (query.from && !from) {
      set.status = 400;
      return { error: "Format from tidak valid. Gunakan YYYY-MM-DD." };
    }

    const count = parseCount(query.count, 5);
    const hasil = hitungOdalan(pura, from ?? new Date(), count);

    return {
      pura: hasil.pura,
      jadwalMendatang: mapJadwal(hasil.jadwalMendatang),
      berikutnya: hasil.berikutnya
        ? { ...hasil.berikutnya, tanggal: formatISODate(hasil.berikutnya.tanggal) }
        : null,
    };
  })
  .get("/odalan/check", ({ query, set }) => {
    if (!query.date) {
      set.status = 400;
      return { error: "Parameter date wajib (YYYY-MM-DD)." };
    }

    const date = parseISODate(query.date);
    if (!date) {
      set.status = 400;
      return { error: "Format date tidak valid. Gunakan YYYY-MM-DD." };
    }

    const pura = parseOdalanDefinition(query);
    if (!pura) {
      set.status = 400;
      return { error: "Parameter odalan tidak lengkap. Gunakan id preset atau sistem wuku/sasih." };
    }

    const ok = isOdalanHariIni(pura, date);
    return {
      tanggal: formatISODate(date),
      pura,
      odalan: ok,
    };
  })
  .get("/odalan/banyak", ({ query }) => {
    const from = query.from ? parseISODate(query.from) : null;
    const countPerPura = parseCount(query.count, 3);

    const hasil = hitungBanyakOdalan(PURA_PRESET, from ?? new Date(), countPerPura);

    return {
      total: hasil.length,
      data: hasil.map((item) => ({
        pura: item.pura,
        jadwal: {
          ...item.jadwal,
          tanggal: formatISODate(item.jadwal.tanggal),
        },
      })),
    };
  });
