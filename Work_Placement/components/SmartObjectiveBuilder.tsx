"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type ObjectiveStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

type SmartObjectiveRow = {
  id: string;
  title: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
  sortOrder: number;
  status: ObjectiveStatus;
  reviewComment: string | null;
  submittedAt: string | null;
};

type FormData = {
  title: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
};

const emptyForm: FormData = {
  title: "",
  specific: "",
  measurable: "",
  achievable: "",
  relevant: "",
  timeBound: ""
};

const SMART_FIELDS: { key: keyof FormData; label: string; letter: string; hint: string; color: string }[] = [
  { key: "specific", letter: "S", label: "Specific", hint: "What exactly do I want to achieve? Who is involved? Where? Why?", color: "bg-blue-50 border-blue-200" },
  { key: "measurable", letter: "M", label: "Measurable", hint: "How will I know when I have achieved it? What evidence will there be?", color: "bg-green-50 border-green-200" },
  { key: "achievable", letter: "A", label: "Achievable", hint: "Is this realistic given my current situation and resources?", color: "bg-yellow-50 border-yellow-200" },
  { key: "relevant", letter: "R", label: "Relevant", hint: "Why is this important to my learning and career goals?", color: "bg-purple-50 border-purple-200" },
  { key: "timeBound", letter: "T", label: "Time-bound", hint: "When will I achieve this by? What is my deadline?", color: "bg-red-50 border-red-200" }
];

const STATUS_STYLES: Record<ObjectiveStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800"
};

function buildSentence(row: SmartObjectiveRow | FormData): string {
  const s = "specific" in row ? row.specific : "";
  const m = "measurable" in row ? row.measurable : "";
  const a = "achievable" in row ? row.achievable : "";
  const r = "relevant" in row ? row.relevant : "";
  const t = "timeBound" in row ? row.timeBound : "";
  if (!s && !m && !a && !r && !t) return "";
  return [s, m && `I will measure this by: ${m}`, a && `This is achievable because: ${a}`, r && `This is relevant because: ${r}`, t && `I will achieve this by: ${t}`]
    .filter(Boolean)
    .join(". ");
}

export function SmartObjectiveBuilder({ initialRows }: { initialRows: SmartObjectiveRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<SmartObjectiveRow[]>(initialRows);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<FormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormData>(emptyForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Drag state
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function clearFeedback() {
    setError(null);
    setMessage(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    clearFeedback();
    setBusy("create");
    const res = await fetch("/api/smart-objectives", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(newForm)
    });
    setBusy(null);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not create objective.");
      return;
    }
    const { objective } = (await res.json()) as { objective: SmartObjectiveRow };
    setRows((prev) => [...prev, { ...objective, submittedAt: objective.submittedAt ?? null }]);
    setNewForm(emptyForm);
    setShowNewForm(false);
    setExpandedId(objective.id);
    setMessage("Objective saved as draft.");
  }

  async function handleSaveEdit(id: string) {
    clearFeedback();
    setBusy(`edit:${id}`);
    const res = await fetch(`/api/smart-objectives/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editForm)
    });
    setBusy(null);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not update objective.");
      return;
    }
    const { objective } = (await res.json()) as { objective: SmartObjectiveRow };
    setRows((prev) => prev.map((r) => (r.id === id ? { ...objective, submittedAt: objective.submittedAt ?? null } : r)));
    setEditingId(null);
    setMessage("Objective updated.");
  }

  async function handleDelete(id: string) {
    clearFeedback();
    setBusy(`delete:${id}`);
    const res = await fetch(`/api/smart-objectives/${id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not delete objective.");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    setMessage("Objective deleted.");
  }

  async function handleSubmit(id: string) {
    clearFeedback();
    setBusy(`submit:${id}`);
    const res = await fetch(`/api/smart-objectives/${id}/submit`, { method: "POST" });
    setBusy(null);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not submit objective.");
      return;
    }
    const { objective } = (await res.json()) as { objective: SmartObjectiveRow };
    setRows((prev) => prev.map((r) => (r.id === id ? { ...objective, submittedAt: objective.submittedAt ?? null } : r)));
    setMessage("Objective submitted for staff review.");
    router.refresh();
  }

  async function saveOrder(newRows: SmartObjectiveRow[]) {
    await fetch("/api/smart-objectives/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: newRows.map((r) => r.id) })
    });
  }

  function handleDragStart(index: number) {
    dragIndex.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(index: number) {
    const from = dragIndex.current;
    if (from === null || from === index) {
      dragIndex.current = null;
      setDragOverIndex(null);
      return;
    }
    const newRows = [...rows];
    const [moved] = newRows.splice(from, 1);
    newRows.splice(index, 0, moved);
    setRows(newRows);
    dragIndex.current = null;
    setDragOverIndex(null);
    saveOrder(newRows);
  }

  function handleDragEnd() {
    dragIndex.current = null;
    setDragOverIndex(null);
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <section className="rounded border bg-white p-4 space-y-2">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="text-xl font-semibold">Unit 2 – SMART Objectives</h2>
            <p className="text-sm text-slate-600">Build your SMART objectives below. Drag cards to reorder, then submit each for staff review.</p>
          </div>
          <button
            type="button"
            className="bg-primary text-white"
            onClick={() => { setShowNewForm((v) => !v); clearFeedback(); }}
          >
            {showNewForm ? "Cancel" : "+ Add Objective"}
          </button>
        </div>

        {/* SMART legend */}
        <div className="flex flex-wrap gap-2 pt-1">
          {SMART_FIELDS.map(({ letter, label, color }) => (
            <span key={letter} className={`text-xs rounded border px-2 py-1 font-semibold ${color}`}>
              <span className="font-bold">{letter}</span> – {label}
            </span>
          ))}
        </div>
      </section>

      {/* New objective form */}
      {showNewForm ? (
        <section className="rounded border bg-white p-4 space-y-3">
          <h3 className="text-lg font-semibold">New SMART Objective</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Objective Title</label>
              <input
                required
                placeholder="e.g. Improve my communication skills"
                value={newForm.title}
                onChange={(e) => setNewForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            {SMART_FIELDS.map(({ key, letter, label, hint, color }) => (
              <div key={key} className={`rounded border p-3 ${color}`}>
                <label className="mb-1 block text-sm font-medium">
                  <span className="font-bold">{letter}</span> – {label}
                </label>
                <p className="text-xs text-slate-500 mb-1">{hint}</p>
                <textarea
                  required
                  rows={2}
                  placeholder={hint}
                  value={newForm[key]}
                  onChange={(e) => setNewForm((p) => ({ ...p, [key]: e.target.value }))}
                />
              </div>
            ))}
            {newForm.specific && (
              <div className="rounded bg-slate-50 border p-3 text-sm text-slate-700">
                <p className="font-medium text-xs text-slate-500 mb-1">SMART Objective Preview</p>
                <p>{buildSentence(newForm)}</p>
              </div>
            )}
            <button className="bg-primary text-white" type="submit" disabled={busy === "create"}>
              {busy === "create" ? "Saving..." : "Save as Draft"}
            </button>
          </form>
        </section>
      ) : null}

      {/* Objective cards */}
      <section className="rounded border bg-white p-4 space-y-3">
        <h3 className="text-lg font-semibold">My Objectives</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-600">No objectives yet. Click "+ Add Objective" to get started.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row, index) => {
              const isEditing = editingId === row.id;
              const isExpanded = expandedId === row.id;
              const isDraggingOver = dragOverIndex === index;
              const canEdit = row.status === "DRAFT" || row.status === "REJECTED";

              return (
                <article
                  key={row.id}
                  draggable={canEdit}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  className={[
                    "rounded border p-3 space-y-2 transition-all",
                    isDraggingOver ? "border-primary bg-blue-50 scale-[1.01]" : "bg-white",
                    canEdit ? "cursor-grab active:cursor-grabbing" : ""
                  ].join(" ")}
                >
                  {/* Card header */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {canEdit ? (
                        <span className="text-slate-400 text-lg select-none flex-shrink-0" title="Drag to reorder">⠿</span>
                      ) : null}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{row.title}</p>
                        {row.submittedAt ? (
                          <p className="text-xs text-slate-500">
                            Submitted {new Date(row.submittedAt).toLocaleDateString("en-GB")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs rounded px-2 py-1 font-medium ${STATUS_STYLES[row.status]}`}>
                        {row.status.toLowerCase().replace("_", " ")}
                      </span>
                      <button
                        type="button"
                        className="border text-sm"
                        onClick={() => setExpandedId(isExpanded ? null : row.id)}
                      >
                        {isExpanded ? "▲ Collapse" : "▼ Expand"}
                      </button>
                    </div>
                  </div>

                  {/* Review comment */}
                  {row.status === "REJECTED" && row.reviewComment ? (
                    <div className="rounded bg-red-50 border border-red-200 p-2 text-sm text-red-800">
                      <span className="font-medium">Staff feedback: </span>{row.reviewComment}
                    </div>
                  ) : null}
                  {row.status === "APPROVED" && row.reviewComment ? (
                    <div className="rounded bg-green-50 border border-green-200 p-2 text-sm text-green-800">
                      <span className="font-medium">Staff feedback: </span>{row.reviewComment}
                    </div>
                  ) : null}

                  {/* Expanded content */}
                  {isExpanded ? (
                    isEditing ? (
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="mb-1 block text-sm font-medium">Objective Title</label>
                          <input
                            value={editForm.title}
                            onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                          />
                        </div>
                        {SMART_FIELDS.map(({ key, letter, label, hint, color }) => (
                          <div key={key} className={`rounded border p-3 ${color}`}>
                            <label className="mb-1 block text-sm font-medium">
                              <span className="font-bold">{letter}</span> – {label}
                            </label>
                            <p className="text-xs text-slate-500 mb-1">{hint}</p>
                            <textarea
                              rows={2}
                              value={editForm[key]}
                              onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                            />
                          </div>
                        ))}
                        {editForm.specific && (
                          <div className="rounded bg-slate-50 border p-3 text-sm text-slate-700">
                            <p className="font-medium text-xs text-slate-500 mb-1">SMART Objective Preview</p>
                            <p>{buildSentence(editForm)}</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="bg-primary text-white"
                            onClick={() => handleSaveEdit(row.id)}
                            disabled={busy === `edit:${row.id}`}
                          >
                            {busy === `edit:${row.id}` ? "Saving..." : "Save Changes"}
                          </button>
                          <button type="button" className="border" onClick={() => setEditingId(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        {SMART_FIELDS.map(({ key, letter, label, color }) => (
                          <div key={key} className={`rounded border p-2 ${color}`}>
                            <p className="text-xs font-semibold text-slate-600 mb-0.5">
                              <span className="font-bold">{letter}</span> – {label}
                            </p>
                            <p className="text-sm">{row[key as keyof SmartObjectiveRow] as string}</p>
                          </div>
                        ))}
                        <div className="rounded bg-slate-50 border p-3 text-sm text-slate-700">
                          <p className="font-medium text-xs text-slate-500 mb-1">Full SMART Objective</p>
                          <p>{buildSentence(row)}</p>
                        </div>
                      </div>
                    )
                  ) : null}

                  {/* Actions */}
                  {!isEditing ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {canEdit ? (
                        <>
                          <button
                            type="button"
                            className="border text-sm"
                            onClick={() => {
                              setEditingId(row.id);
                              setExpandedId(row.id);
                              setEditForm({
                                title: row.title,
                                specific: row.specific,
                                measurable: row.measurable,
                                achievable: row.achievable,
                                relevant: row.relevant,
                                timeBound: row.timeBound
                              });
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="bg-primary text-white text-sm"
                            onClick={() => handleSubmit(row.id)}
                            disabled={busy === `submit:${row.id}`}
                          >
                            {busy === `submit:${row.id}` ? "Submitting..." : "Submit for Review"}
                          </button>
                          <button
                            type="button"
                            className="border text-sm text-red-700"
                            onClick={() => {
                              if (confirm("Delete this objective?")) handleDelete(row.id);
                            }}
                            disabled={busy === `delete:${row.id}`}
                          >
                            {busy === `delete:${row.id}` ? "Deleting..." : "Delete"}
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Feedback */}
      {message ? <p className="text-sm text-emerald-700 font-medium">{message}</p> : null}
      {error ? <p className="text-sm text-red-700 font-medium">{error}</p> : null}
    </div>
  );
}
