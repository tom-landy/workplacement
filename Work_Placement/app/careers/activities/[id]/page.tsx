import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CareersActivitySubmitForm } from "@/components/CareersActivitySubmitForm";
import { CareersActivityReviewTable } from "@/components/CareersActivityReviewTable";

function formatDateUk(value: Date): string {
  return value.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function CareersActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(["ADMIN", "CAREERS_LEAD", "PLACEMENT_OFFICER", "TUTOR", "STUDENT"]);
  const { id } = await params;
  const role = session.user.role as UserRole;

  const activity = await prisma.careersActivity.findUnique({
    where: { id },
    include: {
      completions: {
        include: {
          student: {
            include: {
              user: true
            }
          }
        },
        orderBy: { submittedAt: "desc" }
      }
    }
  });

  if (!activity) {
    return (
      <section className="rounded border bg-white p-4">
        <p>Activity not found.</p>
      </section>
    );
  }

  const student = role === "STUDENT" ? await prisma.studentProfile.findUnique({ where: { userId: session.user.id } }) : null;
  const studentCompletion =
    role === "STUDENT" && student
      ? activity.completions.find((c) => c.studentId === student.id)
      : null;

  const staffRows = activity.completions.map((c) => ({
    id: c.id,
    studentName: c.student.user.name,
    studentEmail: c.student.user.email,
    status: c.status,
    submittedAt: c.submittedAt ? c.submittedAt.toISOString() : null,
    evidenceReference: c.evidenceObjectKey
  }));

  return (
    <div className="space-y-4">
      <section className="rounded border bg-white p-4 space-y-1">
        <h2 className="text-xl font-semibold">{activity.title}</h2>
        <p className="text-sm text-slate-700">{activity.description}</p>
        <p className="text-sm text-slate-700">Year Group: {activity.yearGroup}</p>
        <p className="text-sm text-slate-700">Due: {formatDateUk(activity.dueDate)}</p>
        <p className="text-sm text-slate-700">Gatsby Tags: {activity.gatsbyTags.join(", ")}</p>
      </section>

      {role === "STUDENT" ? (
        <CareersActivitySubmitForm activityId={activity.id} initialEvidence={studentCompletion?.evidenceObjectKey ?? null} />
      ) : (
        <CareersActivityReviewTable activityId={activity.id} rows={staffRows} />
      )}
    </div>
  );
}
