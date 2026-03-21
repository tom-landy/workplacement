import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SmartObjectiveStaffView } from "@/components/SmartObjectiveStaffView";

export default async function CareersUnit2Page() {
  await requireRole(["ADMIN", "CAREERS_LEAD", "PLACEMENT_OFFICER", "TUTOR"]);

  const students = await prisma.studentProfile.findMany({
    include: {
      user: { select: { name: true } },
      smartObjectives: { orderBy: { sortOrder: "asc" } }
    },
    orderBy: { user: { name: "asc" } }
  });

  const groups = students
    .filter((s) => s.smartObjectives.length > 0)
    .map((s) => ({
      studentName: s.user.name,
      yearGroup: s.yearGroup,
      tutorGroup: s.tutorGroup,
      objectives: s.smartObjectives.map((o) => ({
        id: o.id,
        title: o.title,
        specific: o.specific,
        measurable: o.measurable,
        achievable: o.achievable,
        relevant: o.relevant,
        timeBound: o.timeBound,
        status: o.status as "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED",
        reviewComment: o.reviewComment,
        submittedAt: o.submittedAt ? o.submittedAt.toISOString() : null
      }))
    }));

  return <SmartObjectiveStaffView groups={groups} />;
}
