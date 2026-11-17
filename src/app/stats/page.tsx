import { Stats } from "@/components/stats";
import { loadHistory } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const { states, error } = await loadHistory();
  return <Stats initial={states} initialError={error} />;
}
