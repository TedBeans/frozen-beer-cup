import { getAllStates, getEventState } from "./db";
import type { EventState } from "./types";

export async function loadInitial(): Promise<{ state: EventState | null; error: string | null }> {
  try {
    return { state: await getEventState(), error: null };
  } catch (e) {
    return { state: null, error: e instanceof Error ? e.message : "Could not load scores." };
  }
}

export async function loadHistory(): Promise<{ states: EventState[]; error: string | null }> {
  try {
    return { states: await getAllStates(), error: null };
  } catch (e) {
    return { states: [], error: e instanceof Error ? e.message : "Could not load scores." };
  }
}
