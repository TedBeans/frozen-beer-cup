import { verifyTeamPin } from "./db";
import { safeEqual } from "./safe-equal";

export type PinResult = { ok: true } | { ok: false; status: number; error: string };

function adminSecret(): string | undefined {
  return process.env.ADMIN_PIN ?? process.env.SCORER_PIN;
}

/**
 * The admin PIN (ADMIN_PIN env var) unlocks the admin page: teams, handicaps,
 * team PINs and new years. With no PIN set, admin only works in local development.
 */
export function checkAdminPin(pin: unknown): PinResult {
  const required = adminSecret();
  if (!required) {
    if (process.env.NODE_ENV !== "production") return { ok: true };
    return {
      ok: false,
      status: 500,
      error: "ADMIN_PIN is not set on the server. Add it in Vercel project settings and redeploy.",
    };
  }
  if (typeof pin !== "string" || !safeEqual(pin.trim(), required.trim())) {
    return { ok: false, status: 401, error: "Wrong PIN." };
  }
  return { ok: true };
}

/**
 * Each team has its own PIN, and it only unlocks scoring for that team. The admin
 * PIN also works, so mistakes can be fixed for any team.
 */
export async function checkTeamPin(teamId: number, pin: unknown): Promise<PinResult> {
  if (typeof pin !== "string" || pin.trim() === "") {
    return { ok: false, status: 401, error: "Wrong PIN." };
  }
  const secret = adminSecret();
  if (secret && safeEqual(pin.trim(), secret.trim())) return { ok: true };
  if (await verifyTeamPin(teamId, pin)) return { ok: true };
  return { ok: false, status: 401, error: "Wrong PIN." };
}
