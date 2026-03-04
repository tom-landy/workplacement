import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { EmployerListTable } from "@/components/EmployerListTable";

export default async function EmployersPage() {
  const session = await requireRole(["ADMIN", "PLACEMENT_OFFICER", "CAREERS_LEAD", "TUTOR"]);
  const employers = await prisma.employer.findMany({
    include: {
      contacts: { select: { id: true, name: true, email: true, phone: true }, orderBy: { createdAt: "asc" } },
      _count: { select: { contacts: true, placements: true } }
    },
    orderBy: { name: "asc" }
  });
  const canManage = session.user.role === "ADMIN" || session.user.role === "PLACEMENT_OFFICER";

  return (
    <div className="space-y-4">
      <section className="rounded border bg-white p-4">
        <h2 className="text-xl font-semibold">Employers</h2>
        <p className="text-sm text-slate-700">Total employers: {employers.length}</p>
      </section>
      <EmployerListTable
        rows={employers.map((e) => ({
          id: e.id,
          name: e.name,
          sector: e.sector,
          address: e.address,
          website: e.website,
          contactsCount: e._count.contacts,
          placementsCount: e._count.placements,
          contacts: e.contacts
        }))}
        canManage={canManage}
      />
    </div>
  );
}
