import { AdminPanel } from "@/components/admin-panel";
import { loadInitial } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { state, error } = await loadInitial();
  return <AdminPanel initial={state} initialError={error} />;
}
