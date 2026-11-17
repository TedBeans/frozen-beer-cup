import { Scorecards } from "@/components/scorecards";
import { loadInitial } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export default async function CardPage() {
  const { state, error } = await loadInitial();
  return <Scorecards initial={state} initialError={error} />;
}
