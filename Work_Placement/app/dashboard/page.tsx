import { UserRole } from "@prisma/client";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function formatDateUk(value: Date): string {
  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function statusBadge(status: string): string {
  switch (status) {
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-800";
    case "PENDING":
      return "bg-amber-100 text-amber-800";
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-800";
    case "CANCELLED":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatStatus(status: string): string {
  return status.toLowerCase().replaceAll("_", " ");
}

function sumHours(values: Array<{ hours: unknown }>): number {
  return values.reduce((sum, item) => sum + Number(item.hours), 0);
}

export default async function DashboardPage() {
  const session = await requireSession();
  const role = session.user.role as UserRole;
  const now = new Date();

  const where: {
    supervisorContactId?: string;
    studentId?: string;
    studentIdIn?: string[];
  } = {};

  if (role === "EMPLOYER_SUPERVISOR") {
    const link = await prisma.employerAccountLink.findUnique({ where: { userId: session.user.id } });
    if (link) {
      where.supervisorContactId = link.employerContactId;
    }
  }

  if (role === "STUDENT") {
    const student = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } });
    if (student) {
      where.studentId = student.id;
    }
  }

  let tutorStudentIds: string[] = [];
  if (role === "TUTOR") {
    const students = await prisma.studentProfile.findMany({
      where: { tutorUserId: session.user.id },
      select: { id: true }
    });
    tutorStudentIds = students.map((s) => s.id);
  }

  const placements = await prisma.placement.findMany({
    where: {
      ...(where.supervisorContactId ? { supervisorContactId: where.supervisorContactId } : {}),
      ...(where.studentId ? { studentId: where.studentId } : {}),
      ...(role === "TUTOR" ? { studentId: { in: tutorStudentIds } } : {})
    },
    include: {
      student: { include: { user: true } },
      employer: true,
      logs: true
    },
    orderBy: { startDate: "asc" }
  });

  const upcoming = placements.filter((p) => p.startDate >= now).length;
  const active = placements.filter((p) => p.status === "IN_PROGRESS").length;
  const completed = placements.filter((p) => p.status === "COMPLETED").length;
  const logsAwaiting = placements.reduce(
    (sum, p) => sum + p.logs.filter((l) => l.tutorApprovalStatus === "PENDING" || l.employerVerificationStatus === "PENDING").length,
    0
  );

  const totalHoursLogged = placements.reduce((sum, p) => sum + sumHours(p.logs), 0);
  const totalHoursApproved = placements.reduce(
    (sum, p) => sum + sumHours(p.logs.filter((l) => l.tutorApprovalStatus === "APPROVED")),
    0
  );
  const totalHoursVerified = placements.reduce(
    (sum, p) => sum + sumHours(p.logs.filter((l) => l.employerVerificationStatus === "VERIFIED")),
    0
  );

  return (
    <div className="space-y-4">
      <section className="rounded border bg-white p-4">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <p className="text-sm text-slate-700">Overview for role: {role.toLowerCase().replaceAll("_", " ")}</p>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <article className="rounded border bg-white p-4">
          <p className="text-sm text-slate-600">Upcoming placements</p>
          <p className="text-2xl font-semibold">{upcoming}</p>
        </article>
        <article className="rounded border bg-white p-4">
          <p className="text-sm text-slate-600">Active placements</p>
          <p className="text-2xl font-semibold">{active}</p>
        </article>
        <article className="rounded border bg-white p-4">
          <p className="text-sm text-slate-600">Completed placements</p>
          <p className="text-2xl font-semibold">{completed}</p>
        </article>
        <article className="rounded border bg-white p-4">
          <p className="text-sm text-slate-600">Logs awaiting action</p>
          <p className="text-2xl font-semibold">{logsAwaiting}</p>
        </article>
      </section>

      <section className="rounded border bg-white p-4 space-y-3">
        <h3 className="text-lg font-semibold">Hours Summary</h3>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-sm">
              <span>Logged</span>
              <span>{totalHoursLogged.toFixed(1)}h</span>
            </div>
            <div className="h-2 rounded bg-slate-200">
              <div className="h-2 rounded bg-slate-500" style={{ width: "100%" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm">
              <span>Tutor approved</span>
              <span>{totalHoursApproved.toFixed(1)}h</span>
            </div>
            <div className="h-2 rounded bg-slate-200">
              <div
                className="h-2 rounded bg-blue-500"
                style={{ width: `${totalHoursLogged > 0 ? (totalHoursApproved / totalHoursLogged) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm">
              <span>Employer verified</span>
              <span>{totalHoursVerified.toFixed(1)}h</span>
            </div>
            <div className="h-2 rounded bg-slate-200">
              <div
                className="h-2 rounded bg-emerald-500"
                style={{ width: `${totalHoursLogged > 0 ? (totalHoursVerified / totalHoursLogged) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded border bg-white p-4 space-y-3">
        <h3 className="text-lg font-semibold">Placement Schedule (Chronological)</h3>
        <p className="text-sm text-slate-600">Ordered by start date so upcoming placements appear first.</p>

        {placements.length === 0 ? (
          <p className="text-sm text-slate-600">No placements available for your role scope.</p>
        ) : (
          <div className="space-y-3">
            {placements.map((placement) => {
              const logged = sumHours(placement.logs);
              const approved = sumHours(placement.logs.filter((l) => l.tutorApprovalStatus === "APPROVED"));
              const verified = sumHours(placement.logs.filter((l) => l.employerVerificationStatus === "VERIFIED"));

              return (
                <article key={placement.id} className="rounded border p-3">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <p className="font-medium">
                      {placement.student.user.name} <span className="text-slate-500">at {placement.employer.name}</span>
                    </p>
                    <span className={`rounded px-2 py-1 text-xs font-semibold ${statusBadge(placement.status)}`}>
                      {formatStatus(placement.status)}
                    </span>
                  </div>

                  <div className="mt-2 grid gap-2 text-sm md:grid-cols-3">
                    <p>
                      <span className="text-slate-600">Start:</span> {formatDateUk(placement.startDate)}
                    </p>
                    <p>
                      <span className="text-slate-600">End:</span> {formatDateUk(placement.endDate)}
                    </p>
                    <p>
                      <span className="text-slate-600">Target:</span> {placement.hoursTarget}h
                    </p>
                    <p>
                      <span className="text-slate-600">Logged:</span> {logged.toFixed(1)}h
                    </p>
                    <p>
                      <span className="text-slate-600">Tutor approved:</span> {approved.toFixed(1)}h
                    </p>
                    <p>
                      <span className="text-slate-600">Employer verified:</span> {verified.toFixed(1)}h
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
