import { getEventState } from "@/lib/db";
import { fail, int, json } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const year = int(new URL(request.url).searchParams.get("year"));
    const state = await getEventState(year ?? undefined);
    if (!state) return json({ error: "No events yet." }, 404);
    return json(state);
  } catch (err) {
    return fail(err);
  }
}
