import { Leaderboard } from "@/components/leaderboard";
import { loadInitial } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { state, error } = await loadInitial();
  return <Leaderboard initial={state} initialError={error} />;
}
