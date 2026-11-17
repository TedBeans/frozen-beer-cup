import { checkPin } from "@/lib/auth";
import { fail, json } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const scope = body.scope === "admin" ? "admin" : "score";
    const result = checkPin(body.pin, scope);
    if (!result.ok) return json({ error: result.error }, result.status);
    return json({ ok: true });
  } catch (err) {
    return fail(err, 400);
  }
}
