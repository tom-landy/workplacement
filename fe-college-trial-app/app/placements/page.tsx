import { requireRole } from "@/lib/session";
import { RouteShell } from "@/components/RouteShell";

export default async function PlacementsPage() {
  await requireRole(["ADMIN", "PLACEMENT_OFFICER", "TUTOR", "EMPLOYER_SUPERVISOR", "STUDENT"]);
  return <RouteShell title="Placements" detail="Manage and review placements." />;
}
