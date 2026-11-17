import { ScoreEntry } from "@/components/score-entry";
import { loadInitial } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export default async function ScorePage() {
  const { state, error } = await loadInitial();
  return <ScoreEntry initial={state} initialError={error} />;
}
