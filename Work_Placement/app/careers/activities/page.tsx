import Link from "next/link";
import { UserRole } from "@prisma/client";
import { requireRole, requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CareersActivityCreateForm } from "@/components/CareersActivityCreateForm";

function formatDateUk(value: Date): string {
  return value.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function CareersActivitiesPage() {
  const session = await requireRole(["ADMIN", "CAREERS_LEAD", "PLACEMENT_OFFICER", "TUTOR", "STUDENT"]);
  const role = session.user.role as UserRole;

  let rows = await prisma.careersActivity.findMany({ orderBy: { dueDate: "asc" } });

  if (role === "STUDENT") {
    const student = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } });
    rows = student
      ? await prisma.careersActivity.findMany({ where: { yearGroup: student.yearGroup }, orderBy: { dueDate: "asc" } })
      : [];
  }

  const canCreate = role === "ADMIN" || role === "CAREERS_LEAD" || role === "PLACEMENT_OFFICER";

  return (
    <div className="space-y-4">
      <section className="rounded border bg-white p-4">
        <h2 className="text-xl font-semibold">Careers Activities</h2>
        <p className="text-sm text-slate-700">Activities aligned to Gatsby benchmarks by year group.</p>
      </section>

      {canCreate ? <CareersActivityCreateForm /> : null}

      <section className="rounded border bg-white p-4 space-y-3">
        <h3 className="text-lg font-semibold">Activity List</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-600">No activities found.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((activity) => (
              <article key={activity.id} className="rounded border p-3">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-slate-600">{activity.description}</p>
                    <p className="text-sm text-slate-600">Year Group: {activity.yearGroup}</p>
                    <p className="text-sm text-slate-600">Due: {formatDateUk(activity.dueDate)}</p>
                    <p className="text-sm text-slate-600">Tags: {activity.gatsbyTags.join(", ")}</p>
                  </div>
                  <Link className="text-sm underline text-primary" href={`/careers/activities/${activity.id}`}>
                    Open
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
