import { requireRole } from "@/lib/session";
import { RouteShell } from "@/components/RouteShell";

export default async function StudentsPage() {
  await requireRole(["ADMIN", "CAREERS_LEAD", "PLACEMENT_OFFICER", "TUTOR"]);
  return <RouteShell title="Students" detail="Staff student list and filters." />;
}
