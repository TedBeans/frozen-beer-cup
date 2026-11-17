import { checkAdminPin, checkTeamPin } from "@/lib/auth";
import { fail, int, json } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const teamId = int(body.teamId);
    const result =
      body.scope === "admin" || teamId === null
        ? checkAdminPin(body.pin)
        : await checkTeamPin(teamId, body.pin);
    if (!result.ok) return json({ error: result.error }, result.status);
    return json({ ok: true });
  } catch (err) {
    return fail(err, 400);
  }
}
