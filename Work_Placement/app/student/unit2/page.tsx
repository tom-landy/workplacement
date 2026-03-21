import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SmartObjectiveBuilder } from "@/components/SmartObjectiveBuilder";

export default async function StudentUnit2Page() {
  const session = await requireRole(["STUDENT"]);

  const student = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } });

  const objectives = student
    ? await prisma.smartObjective.findMany({
        where: { studentId: student.id },
        orderBy: { sortOrder: "asc" }
      })
    : [];

  return (
    <SmartObjectiveBuilder
      initialRows={objectives.map((o) => ({
        id: o.id,
        title: o.title,
        specific: o.specific,
        measurable: o.measurable,
        achievable: o.achievable,
        relevant: o.relevant,
        timeBound: o.timeBound,
        sortOrder: o.sortOrder,
        status: o.status as "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED",
        reviewComment: o.reviewComment,
        submittedAt: o.submittedAt ? o.submittedAt.toISOString() : null
      }))}
    />
  );
}
