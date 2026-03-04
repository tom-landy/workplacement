import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function CareersReportingPage() {
  await requireRole(["ADMIN", "CAREERS_LEAD", "PLACEMENT_OFFICER", "TUTOR"]);

  const completions = await prisma.studentActivityCompletion.findMany({
    include: { activity: true, student: true }
  });

  const byYearGroup = new Map<string, { total: number; approved: number; submitted: number; rejected: number }>();
  const byTag = new Map<string, { total: number; approved: number }>();

  for (const completion of completions) {
    const year = completion.activity.yearGroup;
    const current = byYearGroup.get(year) ?? { total: 0, approved: 0, submitted: 0, rejected: 0 };
    current.total += 1;
    if (completion.status === "APPROVED") current.approved += 1;
    if (completion.status === "SUBMITTED") current.submitted += 1;
    if (completion.status === "REJECTED") current.rejected += 1;
    byYearGroup.set(year, current);

    for (const tag of completion.activity.gatsbyTags) {
      const tagCurrent = byTag.get(tag) ?? { total: 0, approved: 0 };
      tagCurrent.total += 1;
      if (completion.status === "APPROVED") tagCurrent.approved += 1;
      byTag.set(tag, tagCurrent);
    }
  }

  const yearRows = Array.from(byYearGroup.entries()).sort(([a], [b]) => a.localeCompare(b));
  const tagRows = Array.from(byTag.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-4">
      <section className="rounded border bg-white p-4">
        <h2 className="text-xl font-semibold">Careers Reporting</h2>
        <p className="text-sm text-slate-700">Completion by year group and Gatsby benchmark.</p>
      </section>

      <section className="rounded border bg-white p-4 space-y-3">
        <h3 className="text-lg font-semibold">By Year Group</h3>
        {yearRows.length === 0 ? (
          <p className="text-sm text-slate-600">No completion data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Year Group</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Approved</th>
                  <th className="py-2">Submitted</th>
                  <th className="py-2">Rejected</th>
                  <th className="py-2">Approval %</th>
                </tr>
              </thead>
              <tbody>
                {yearRows.map(([year, row]) => (
                  <tr key={year} className="border-b">
                    <td className="py-2">{year}</td>
                    <td className="py-2">{row.total}</td>
                    <td className="py-2">{row.approved}</td>
                    <td className="py-2">{row.submitted}</td>
                    <td className="py-2">{row.rejected}</td>
                    <td className="py-2">{row.total > 0 ? Math.round((row.approved / row.total) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded border bg-white p-4 space-y-3">
        <h3 className="text-lg font-semibold">By Gatsby Tag</h3>
        {tagRows.length === 0 ? (
          <p className="text-sm text-slate-600">No Gatsby data yet.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-3">
            {tagRows.map(([tag, row]) => (
              <article key={tag} className="rounded border p-3">
                <p className="font-medium">{tag}</p>
                <p className="text-sm text-slate-700">Approved: {row.approved} / {row.total}</p>
                <div className="mt-2 h-2 bg-slate-200 rounded">
                  <div
                    className="h-2 bg-emerald-500 rounded"
                    style={{ width: `${row.total > 0 ? (row.approved / row.total) * 100 : 0}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
