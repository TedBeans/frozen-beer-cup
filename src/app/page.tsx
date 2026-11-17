import { Feed } from "@/components/feed";
import { loadInitial } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { state, error } = await loadInitial();
  return <Feed initial={state} initialError={error} />;
}
