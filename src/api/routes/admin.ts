import { Elysia } from "elysia";
import {
  banResponse,
  checkAdminAuth,
  clearAdminFailedAttempts,
  defaultClientKey,
  getBanStatus,
  getWhitelistInfo,
  recordAdminFailedAttempt,
  revokeWhitelist,
  unbanIp,
  whitelistIp,
} from "../middleware/rateLimit";

function verifyCredentials(body: any, request: Request): boolean {
  if (checkAdminAuth(request)) return true;

  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminUser || !adminPass) return false;

  if (body && typeof body === "object") {
    if (body.username === adminUser && body.password === adminPass) {
      return true;
    }
  }

  return false;
}

async function authenticateAdmin(
  body: any,
  request: Request,
  callerIp: string,
  set: any,
): Promise<{ ok: true } | { ok: false; response: any }> {
  // 1. Cek apakah IP pemanggil sedang dalam status ban (12 jam)
  const banData = await getBanStatus(callerIp);
  if (banData && banData.unbanAt > Date.now()) {
    set.status = 403;
    return {
      ok: false,
      response: banResponse(
        banData.unbanAt,
        banData.violations,
        "IP Anda sedang dibanned selama 12 jam karena pelanggaran keamanan atau salah kredensial 3 kali.",
      ),
    };
  }

  // 2. Verifikasi kredensial
  const isAuthed = verifyCredentials(body, request);
  if (isAuthed) {
    await clearAdminFailedAttempts(callerIp);
    return { ok: true };
  }

  // 3. Kredensial salah: catat percobaan (maksimal 3 kali, lalu ban 12 jam)
  const attemptResult = await recordAdminFailedAttempt(callerIp);

  if (attemptResult.banned) {
    set.status = 403;
    return {
      ok: false,
      response: banResponse(
        attemptResult.unbanAt ?? Date.now() + 43_200_000,
        3,
        "IP Anda telah dibanned selama 12 jam karena salah memasukkan kredensial admin sebanyak 3 kali.",
      ),
    };
  }

  set.status = 401;
  return {
    ok: false,
    response: {
      error: "Unauthorized",
      code: "INVALID_ADMIN_CREDENTIALS",
      message: `Kredensial admin tidak valid. Sisa kesempatan: ${attemptResult.remainingAttempts} kali sebelum IP Anda dibanned selama 12 jam.`,
      sisaKesempatan: attemptResult.remainingAttempts,
      percobaanKe: attemptResult.attempts,
      maksimalPercobaan: 3,
    },
  };
}

export const adminRoutes = new Elysia({ name: "admin" })
  .post("/admin/whitelist", async ({ body, request, set }: any) => {
    const callerIp = defaultClientKey(request);
    const auth = await authenticateAdmin(body, request, callerIp, set);
    if (!auth.ok) return auth.response;

    const targetIp = (body && typeof body === "object" && body.ip) ? String(body.ip).trim() : callerIp;
    const ttlSeconds = Number(process.env.ADMIN_WHITELIST_TTL || 3600);

    const result = await whitelistIp(targetIp, ttlSeconds);

    return {
      status: "success",
      message: `IP ${targetIp} berhasil di-whitelist dan kebal rate limiting selama 1 jam.`,
      ip: targetIp,
      durasiDetik: result.expiresInSeconds,
      kadaluarsaPada: new Date(result.expiresAt).toISOString(),
    };
  })
  .post("/admin/kebal", async ({ body, request, set }: any) => {
    const callerIp = defaultClientKey(request);
    const auth = await authenticateAdmin(body, request, callerIp, set);
    if (!auth.ok) return auth.response;

    const targetIp = (body && typeof body === "object" && body.ip) ? String(body.ip).trim() : callerIp;
    const ttlSeconds = Number(process.env.ADMIN_WHITELIST_TTL || 3600);

    const result = await whitelistIp(targetIp, ttlSeconds);

    return {
      status: "success",
      message: `IP ${targetIp} berhasil di-whitelist dan kebal rate limiting selama 1 jam.`,
      ip: targetIp,
      durasiDetik: result.expiresInSeconds,
      kadaluarsaPada: new Date(result.expiresAt).toISOString(),
    };
  })
  .get("/admin/status", async ({ query, request, set }) => {
    const callerIp = defaultClientKey(request);
    const auth = await authenticateAdmin(null, request, callerIp, set);
    if (!auth.ok) return auth.response;

    const targetIp = query.ip ? String(query.ip).trim() : callerIp;
    const info = await getWhitelistInfo(targetIp);

    if (!info) {
      return {
        ip: targetIp,
        kebal: false,
        message: "IP ini tidak sedang dalam status kebal/whitelist.",
      };
    }

    const sisaDetik = Math.max(0, Math.ceil((info.expiresAt - Date.now()) / 1000));

    return {
      ip: targetIp,
      kebal: true,
      sisaDetik,
      kadaluarsaPada: new Date(info.expiresAt).toISOString(),
    };
  })
  .post("/admin/unban", async ({ body, request, set }: any) => {
    const callerIp = defaultClientKey(request);
    const auth = await authenticateAdmin(body, request, callerIp, set);
    if (!auth.ok) return auth.response;

    const targetIp = (body && typeof body === "object" && body.ip) ? String(body.ip).trim() : callerIp;

    await unbanIp(targetIp);
    await clearAdminFailedAttempts(targetIp);

    return {
      status: "success",
      message: `Status ban untuk IP ${targetIp} berhasil dihapus.`,
      ip: targetIp,
    };
  })
  .post("/admin/revoke", async ({ body, request, set }: any) => {
    const callerIp = defaultClientKey(request);
    const auth = await authenticateAdmin(body, request, callerIp, set);
    if (!auth.ok) return auth.response;

    // Target IP: dari body.ip, atau IP pemanggil sendiri jika tidak ada
    const targetIp = (body && typeof body === "object" && body.ip) ? String(body.ip).trim() : callerIp;

    const info = await getWhitelistInfo(targetIp);
    if (!info) {
      set.status = 404;
      return {
        status: "not_found",
        message: `IP ${targetIp} tidak sedang dalam status whitelist / kebal.`,
        ip: targetIp,
      };
    }

    await revokeWhitelist(targetIp);

    return {
      status: "success",
      message: `Akses kebal rate limiting untuk IP ${targetIp} berhasil dicabut.`,
      ip: targetIp,
    };
  });
