"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmailButton } from "@/components/EmailButton";

type StudentRow = {
  id: string;
  name: string;
  email: string;
  yearGroup: string;
  tutorGroup: string;
};

export function StudentListTable({ rows, canDelete }: { rows: StudentRow[]; canDelete: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.email, r.yearGroup, r.tutorGroup].some((value) => value.toLowerCase().includes(q))
    );
  }, [rows, query]);

  async function deleteStudent(student: StudentRow) {
    const confirmed = window.confirm(`Delete student ${student.name} (${student.email})? This removes all linked student data.`);
    if (!confirmed) return;

    setError(null);
    setBusyId(student.id);

    const response = await fetch(`/api/students/${student.id}`, { method: "DELETE" });
    setBusyId(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not delete student.");
      return;
    }

    router.refresh();
  }

  return (
    <section className="rounded border bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Student Records</h3>
        <input
          placeholder="Search students"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-600">No students found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Year</th>
                <th className="py-2">Tutor Group</th>
                {canDelete ? <th className="py-2">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-2">{row.name}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <span>{row.email}</span>
                      <EmailButton email={row.email} />
                    </div>
                  </td>
                  <td className="py-2">{row.yearGroup}</td>
                  <td className="py-2">{row.tutorGroup}</td>
                  {canDelete ? (
                    <td className="py-2">
                      <button
                        type="button"
                        className="bg-rose-700 text-white"
                        onClick={() => deleteStudent(row)}
                        disabled={busyId !== null}
                      >
                        {busyId === row.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {canDelete ? <p className="text-xs text-slate-500">Delete is admin-only and audited.</p> : null}
    </section>
  );
}
