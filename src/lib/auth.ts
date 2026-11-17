import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export type PinResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * Scoring and admin writes need a shared PIN. SCORER_PIN unlocks scoring;
 * ADMIN_PIN (optional, defaults to SCORER_PIN) unlocks roster and event changes.
 * With no PIN set, writes only work in local development.
 */
export function checkPin(pin: unknown, scope: "score" | "admin" = "score"): PinResult {
  const scorer = process.env.SCORER_PIN;
  const required = scope === "admin" ? (process.env.ADMIN_PIN ?? scorer) : scorer;
  if (!required) {
    if (process.env.NODE_ENV !== "production") return { ok: true };
    return {
      ok: false,
      status: 500,
      error: "SCORER_PIN is not set on the server. Add it in Vercel project settings and redeploy.",
    };
  }
  if (typeof pin !== "string" || !safeEqual(pin.trim(), required.trim())) {
    return { ok: false, status: 401, error: "Wrong PIN." };
  }
  return { ok: true };
}
