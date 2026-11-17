import { checkTeamPin } from "@/lib/auth";
import { clearScore, saveScore } from "@/lib/db";
import { fail, int, json, optionalInt } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const eventId = int(body.eventId);
    const teamId = int(body.teamId);
    if (teamId === null) return json({ error: "Missing team." }, 400);
    const auth = await checkTeamPin(teamId, body.pin);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const hole = int(body.hole);
    const gross = int(body.gross);
    if (eventId === null || teamId === null || hole === null || gross === null) {
      return json({ error: "Missing event, team, hole or score." }, 400);
    }
    if (hole < 1 || hole > 18) return json({ error: "Hole must be 1 to 18." }, 400);
    if (gross < 1 || gross > 15) return json({ error: "Score must be 1 to 15." }, 400);

    await saveScore({
      eventId,
      teamId,
      hole,
      gross,
      drivePlayerId: optionalInt(body.drivePlayerId),
      puttPlayerId: optionalInt(body.puttPlayerId),
    });
    return json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const eventId = int(body.eventId);
    const teamId = int(body.teamId);
    if (teamId === null) return json({ error: "Missing team." }, 400);
    const auth = await checkTeamPin(teamId, body.pin);
    if (!auth.ok) return json({ error: auth.error }, auth.status);
    const hole = int(body.hole);
    if (eventId === null || teamId === null || hole === null) {
      return json({ error: "Missing event, team or hole." }, 400);
    }
    await clearScore(eventId, teamId, hole);
    return json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
