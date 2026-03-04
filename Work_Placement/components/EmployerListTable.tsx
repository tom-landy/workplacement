"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmailButton } from "@/components/EmailButton";

type EmployerRow = {
  id: string;
  name: string;
  sector: string;
  address: string;
  website: string | null;
  contactsCount: number;
  placementsCount: number;
  contacts: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
  }>;
};

export function EmployerListTable({ rows, canManage }: { rows: EmployerRow[]; canManage: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState({ name: "", sector: "", address: "", website: "" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.sector, r.address, r.website ?? ""].some((value) => value.toLowerCase().includes(q))
    );
  }, [rows, query]);

  function startEdit(row: EmployerRow) {
    setEditingId(row.id);
    setFormState({
      name: row.name,
      sector: row.sector,
      address: row.address,
      website: row.website ?? ""
    });
    setError(null);
  }

  async function saveEdit(id: string) {
    setBusyId(id);
    setError(null);

    const response = await fetch(`/api/employers/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(formState)
    });
    setBusyId(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not update employer.");
      return;
    }

    setEditingId(null);
    router.refresh();
  }

  async function deleteEmployer(row: EmployerRow) {
    const confirmed = window.confirm(
      `Delete employer ${row.name}? This will remove linked placements, opportunities, interactions and contacts.`
    );
    if (!confirmed) return;

    setBusyId(row.id);
    setError(null);

    const response = await fetch(`/api/employers/${row.id}`, { method: "DELETE" });
    setBusyId(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not delete employer.");
      return;
    }

    router.refresh();
  }

  return (
    <section className="rounded border bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Employer Records</h3>
        <input
          placeholder="Search employers"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-600">No employers found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Name</th>
                <th className="py-2">Sector</th>
                <th className="py-2">Address</th>
                <th className="py-2">Website</th>
                <th className="py-2">Contacts</th>
                <th className="py-2">Placements</th>
                {canManage ? <th className="py-2">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const editing = editingId === row.id;
                return (
                  <tr key={row.id} className="border-b align-top">
                    <td className="py-2">
                      {editing ? (
                        <input
                          value={formState.name}
                          onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                        />
                      ) : (
                        row.name
                      )}
                    </td>
                    <td className="py-2">
                      {editing ? (
                        <input
                          value={formState.sector}
                          onChange={(e) => setFormState((prev) => ({ ...prev, sector: e.target.value }))}
                        />
                      ) : (
                        row.sector
                      )}
                    </td>
                    <td className="py-2 min-w-56">
                      {editing ? (
                        <input
                          value={formState.address}
                          onChange={(e) => setFormState((prev) => ({ ...prev, address: e.target.value }))}
                        />
                      ) : (
                        row.address
                      )}
                    </td>
                    <td className="py-2">
                      {editing ? (
                        <input
                          value={formState.website}
                          onChange={(e) => setFormState((prev) => ({ ...prev, website: e.target.value }))}
                          placeholder="https://..."
                        />
                      ) : (
                        row.website ?? "-"
                      )}
                    </td>
                    <td className="py-2">
                      <div className="space-y-1">
                        <p>{row.contactsCount}</p>
                        {row.contacts.map((contact) => (
                          <div key={contact.id} className="rounded border border-slate-200 px-2 py-1">
                            <p className="text-xs font-medium">{contact.name}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                              <span>{contact.email}</span>
                              <EmailButton
                                email={contact.email}
                                label="Email Contact"
                                subject={`Work placement: ${row.name}`}
                                className="inline-flex items-center rounded border border-slate-300 px-2 py-0.5 text-xs text-primary hover:bg-slate-50"
                              />
                            </div>
                            <p className="text-xs text-slate-500">{contact.phone}</p>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-2">{row.placementsCount}</td>
                    {canManage ? (
                      <td className="py-2">
                        <div className="flex gap-2">
                          {editing ? (
                            <>
                              <button
                                type="button"
                                className="bg-primary text-white"
                                onClick={() => saveEdit(row.id)}
                                disabled={busyId !== null}
                              >
                                {busyId === row.id ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                className="bg-slate-600 text-white"
                                onClick={() => setEditingId(null)}
                                disabled={busyId !== null}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="bg-slate-800 text-white"
                                onClick={() => startEdit(row)}
                                disabled={busyId !== null}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="bg-rose-700 text-white"
                                onClick={() => deleteEmployer(row)}
                                disabled={busyId !== null}
                              >
                                {busyId === row.id ? "Deleting..." : "Delete"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {canManage ? <p className="text-xs text-slate-500">Edit/delete actions are audited.</p> : null}
    </section>
  );
}
