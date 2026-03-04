"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ProspectRow = {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  address: string | null;
  sector: string | null;
  notes: string | null;
  status: string;
  submittedAt: string | null;
  reviewComment: string | null;
};

type ProspectFormState = {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  sector: string;
  notes: string;
};

const emptyForm: ProspectFormState = {
  companyName: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
  sector: "",
  notes: ""
};

function toFormState(row: ProspectRow): ProspectFormState {
  return {
    companyName: row.companyName,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone ?? "",
    address: row.address ?? "",
    sector: row.sector ?? "",
    notes: row.notes ?? ""
  };
}

export function StudentProspectsManager({ initialRows }: { initialRows: ProspectRow[] }) {
  const router = useRouter();
  const [createForm, setCreateForm] = useState<ProspectFormState>(emptyForm);
  const [editForm, setEditForm] = useState<ProspectFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function createProspect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setBusy("create");

    const response = await fetch("/api/students/prospects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(createForm)
    });

    setBusy(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not create prospect.");
      return;
    }

    setCreateForm(emptyForm);
    setMessage("Prospective employer saved as draft.");
    router.refresh();
  }

  async function saveEdit(id: string) {
    setError(null);
    setMessage(null);
    setBusy(`edit:${id}`);

    const response = await fetch(`/api/students/prospects/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editForm)
    });

    setBusy(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not update prospect.");
      return;
    }

    setEditingId(null);
    setMessage("Draft updated.");
    router.refresh();
  }

  async function submitProspect(id: string) {
    setError(null);
    setMessage(null);
    setBusy(`submit:${id}`);

    const response = await fetch(`/api/students/prospects/${id}/submit`, {
      method: "POST"
    });

    setBusy(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not submit prospect.");
      return;
    }

    setMessage("Prospective employer submitted for staff review.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="rounded border bg-white p-4 space-y-3">
        <h3 className="text-lg font-semibold">Add Prospective Employer</h3>
        <form onSubmit={createProspect} className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Employer Name</label>
            <input required value={createForm.companyName} onChange={(e) => setCreateForm((p) => ({ ...p, companyName: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Contact Name</label>
            <input required value={createForm.contactName} onChange={(e) => setCreateForm((p) => ({ ...p, contactName: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Contact Email</label>
            <input required type="email" value={createForm.contactEmail} onChange={(e) => setCreateForm((p) => ({ ...p, contactEmail: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Contact Phone</label>
            <input value={createForm.contactPhone} onChange={(e) => setCreateForm((p) => ({ ...p, contactPhone: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Address</label>
            <input value={createForm.address} onChange={(e) => setCreateForm((p) => ({ ...p, address: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Sector</label>
            <input value={createForm.sector} onChange={(e) => setCreateForm((p) => ({ ...p, sector: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <textarea rows={3} value={createForm.notes} onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <button className="bg-primary text-white" type="submit" disabled={busy === "create"}>
              {busy === "create" ? "Saving..." : "Save Draft"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded border bg-white p-4 space-y-3">
        <h3 className="text-lg font-semibold">My Submitted Prospects</h3>

        {initialRows.length === 0 ? (
          <p className="text-sm text-slate-600">No prospects yet.</p>
        ) : (
          <div className="space-y-2">
            {initialRows.map((row) => {
              const isDraft = row.status === "DRAFT";
              const isEditing = editingId === row.id;

              return (
                <article key={row.id} className="rounded border p-3 space-y-2">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-medium">{row.companyName}</p>
                    <span className="text-xs rounded bg-slate-100 px-2 py-1">{row.status.toLowerCase().replaceAll("_", " ")}</span>
                  </div>

                  {isEditing ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      <input value={editForm.companyName} onChange={(e) => setEditForm((p) => ({ ...p, companyName: e.target.value }))} />
                      <input value={editForm.contactName} onChange={(e) => setEditForm((p) => ({ ...p, contactName: e.target.value }))} />
                      <input value={editForm.contactEmail} onChange={(e) => setEditForm((p) => ({ ...p, contactEmail: e.target.value }))} />
                      <input value={editForm.contactPhone} onChange={(e) => setEditForm((p) => ({ ...p, contactPhone: e.target.value }))} />
                      <input value={editForm.address} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} />
                      <input value={editForm.sector} onChange={(e) => setEditForm((p) => ({ ...p, sector: e.target.value }))} />
                      <textarea className="md:col-span-2" value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} />
                    </div>
                  ) : (
                    <div className="text-sm text-slate-700 space-y-1">
                      <p>Contact: {row.contactName} ({row.contactEmail})</p>
                      <p>Phone: {row.contactPhone || "-"}</p>
                      <p>Address: {row.address || "-"}</p>
                      <p>Sector: {row.sector || "-"}</p>
                      <p>Notes: {row.notes || "-"}</p>
                      <p>Submitted: {row.submittedAt ? new Date(row.submittedAt).toLocaleDateString("en-GB") : "-"}</p>
                      {row.reviewComment ? <p>Staff comment: {row.reviewComment}</p> : null}
                    </div>
                  )}

                  {isDraft ? (
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button
                            className="bg-primary text-white"
                            type="button"
                            onClick={() => saveEdit(row.id)}
                            disabled={busy === `edit:${row.id}`}
                          >
                            {busy === `edit:${row.id}` ? "Saving..." : "Save Changes"}
                          </button>
                          <button className="border" type="button" onClick={() => setEditingId(null)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="border"
                            type="button"
                            onClick={() => {
                              setEditingId(row.id);
                              setEditForm(toFormState(row));
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="bg-primary text-white"
                            type="button"
                            onClick={() => submitProspect(row.id)}
                            disabled={busy === `submit:${row.id}`}
                          >
                            {busy === `submit:${row.id}` ? "Submitting..." : "Submit for Review"}
                          </button>
                        </>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </section>
    </div>
  );
}
