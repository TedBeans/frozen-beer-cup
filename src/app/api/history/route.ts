import { getAllStates } from "@/lib/db";
import { fail, json } from "@/lib/api";

export async function GET() {
  try {
    return json(await getAllStates());
  } catch (err) {
    return fail(err);
  }
}
