import { SakaCalendar } from "./SakaCalendar";
import type { HariRaya } from "./hariRayaEngine";
import { getHariRayaEngine } from "./hariRayaEngine";

/**
 * Mendapatkan daftar semua hari raya rahinan pada tanggal tertentu
 */
export function getHariRaya(cal: SakaCalendar): HariRaya[] {
  return getHariRayaEngine(cal);
}
