import { Board } from "@/components/board";
import { loadInitial } from "@/lib/server-state";

export const dynamic = "force-dynamic";
export const metadata = { title: "Frozen Beer Cup: Board" };

export default async function BoardPage() {
  const { state, error } = await loadInitial();
  return <Board initial={state} initialError={error} />;
}
