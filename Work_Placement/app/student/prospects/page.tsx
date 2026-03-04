import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { StudentProspectsManager } from "@/components/StudentProspectsManager";

export default async function StudentProspectsPage() {
  const session = await requireRole(["STUDENT"]);

  const student = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } });

  const prospects = student
    ? await prisma.prospectEmployer.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" }
      })
    : [];

  return (
    <div className="space-y-4">
      <section className="rounded border bg-white p-4">
        <h2 className="text-xl font-semibold">My Employment Details</h2>
        <p className="text-sm text-slate-700">Add employment or prospective employer details and submit for staff review.</p>
      </section>

      <StudentProspectsManager
        initialRows={prospects.map((p) => ({
          id: p.id,
          companyName: p.companyName,
          contactName: p.contactName,
          contactEmail: p.contactEmail,
          contactPhone: p.contactPhone,
          address: p.address,
          sector: p.sector,
          notes: p.notes,
          status: p.status,
          submittedAt: p.submittedAt ? p.submittedAt.toISOString() : null,
          reviewComment: p.reviewComment
        }))}
      />
    </div>
  );
}
