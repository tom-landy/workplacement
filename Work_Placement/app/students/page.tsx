import { requireRole } from "@/lib/session";
import { StudentImportForm } from "@/components/StudentImportForm";
import { StudentListTable } from "@/components/StudentListTable";
import { prisma } from "@/lib/prisma";

export default async function StudentsPage() {
  const session = await requireRole(["ADMIN", "CAREERS_LEAD", "PLACEMENT_OFFICER", "TUTOR"]);
  const studentsCount = await prisma.studentProfile.count();
  const students = await prisma.studentProfile.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" }
  });

  return (
    <div className="space-y-4">
      <section className="rounded border bg-white p-4">
        <h2 className="text-xl font-semibold">Students</h2>
        <p className="text-sm text-slate-700">Total students: {studentsCount}</p>
      </section>
      {session.user.role === "ADMIN" ? <StudentImportForm /> : null}
      <StudentListTable
        rows={students.map((s) => ({
          id: s.id,
          name: s.user.name,
          email: s.user.email,
          yearGroup: s.yearGroup,
          tutorGroup: s.tutorGroup
        }))}
        canDelete={session.user.role === "ADMIN"}
      />
    </div>
  );
}
