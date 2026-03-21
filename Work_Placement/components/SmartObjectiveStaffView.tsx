"use client";

import { useState } from "react";
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
  status: ObjectiveStatus;
  reviewComment: string | null;
  submittedAt: string | null;
};

type StudentGroup = {
  studentName: string;
  yearGroup: string;
  tutorGroup: string;
  objectives: SmartObjectiveRow[];
};

const STATUS_STYLES: Record<ObjectiveStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800"
};

const SMART_FIELDS: { key: keyof SmartObjectiveRow; letter: string; label: string }[] = [
  { key: "specific", letter: "S", label: "Specific" },
  { key: "measurable", letter: "M", label: "Measurable" },
  { key: "achievable", letter: "A", label: "Achievable" },
  { key: "relevant", letter: "R", label: "Relevant" },
  { key: "timeBound", letter: "T", label: "Time-bound" }
];

export function SmartObjectiveStaffView({ groups }: { groups: StudentGroup[] }) {
  const router = useRouter();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"ALL" | ObjectiveStatus>("SUBMITTED");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submitReview(id: string, approved: boolean) {
    setError(null);
    setMessage(null);
    setBusy(`review:${id}:${approved}`);
    const res = await fetch(`/api/smart-objectives/${id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approved, comment: reviewComment.trim() || undefined })
    });
    setBusy(null);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not save review.");
      return;
    }
    setReviewingId(null);
    setReviewComment("");
    setMessage(`Objective ${approved ? "approved" : "rejected"}.`);
    router.refresh();
  }

  const allObjectives = groups.flatMap((g) =>
    g.objectives.map((o) => ({ ...o, studentName: g.studentName, yearGroup: g.yearGroup, tutorGroup: g.tutorGroup }))
  );

  const filtered = filterStatus === "ALL"
    ? allObjectives
    : allObjectives.filter((o) => o.status === filterStatus);

  const counts = {
    ALL: allObjectives.length,
    SUBMITTED: allObjectives.filter((o) => o.status === "SUBMITTED").length,
    APPROVED: allObjectives.filter((o) => o.status === "APPROVED").length,
    REJECTED: allObjectives.filter((o) => o.status === "REJECTED").length,
    DRAFT: allObjectives.filter((o) => o.status === "DRAFT").length
  };

  return (
    <div className="space-y-4">
      <section className="rounded border bg-white p-4 space-y-3">
        <h2 className="text-xl font-semibold">Unit 2 – Student SMART Objectives</h2>
        <p className="text-sm text-slate-600">Review and approve or reject student SMART objectives.</p>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {(["ALL", "SUBMITTED", "APPROVED", "REJECTED", "DRAFT"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={filterStatus === s ? "bg-primary text-white text-sm" : "border text-sm"}
              onClick={() => setFilterStatus(s)}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()} ({counts[s]})
            </button>
          ))}
        </div>
      </section>

      <section className="rounded border bg-white p-4 space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-600">No objectives found for this filter.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((obj) => {
              const isExpanded = expandedId === obj.id;
              const isReviewing = reviewingId === obj.id;

              return (
                <article key={obj.id} className="rounded border p-3 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{obj.title}</p>
                      <p className="text-xs text-slate-500">
                        {obj.studentName} · {obj.yearGroup} · {obj.tutorGroup}
                        {obj.submittedAt ? ` · Submitted ${new Date(obj.submittedAt).toLocaleDateString("en-GB")}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs rounded px-2 py-1 font-medium ${STATUS_STYLES[obj.status]}`}>
                        {obj.status.toLowerCase().replace("_", " ")}
                      </span>
                      <button
                        type="button"
                        className="border text-sm"
                        onClick={() => setExpandedId(isExpanded ? null : obj.id)}
                      >
                        {isExpanded ? "▲" : "▼"}
                      </button>
                    </div>
                  </div>

                  {obj.reviewComment ? (
                    <div className={`rounded border p-2 text-sm ${obj.status === "APPROVED" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                      <span className="font-medium">Feedback: </span>{obj.reviewComment}
                    </div>
                  ) : null}

                  {isExpanded ? (
                    <div className="space-y-2 pt-1">
                      {SMART_FIELDS.map(({ key, letter, label }) => (
                        <div key={key} className="rounded bg-slate-50 border p-2">
                          <p className="text-xs font-semibold text-slate-600 mb-0.5">
                            <span className="font-bold">{letter}</span> – {label}
                          </p>
                          <p className="text-sm">{obj[key] as string}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {obj.status === "SUBMITTED" ? (
                    isReviewing ? (
                      <div className="space-y-2 pt-1">
                        <div>
                          <label className="mb-1 block text-sm font-medium">Feedback for student (optional)</label>
                          <textarea
                            rows={2}
                            placeholder="Optional comment for the student..."
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="bg-green-700 text-white text-sm"
                            onClick={() => submitReview(obj.id, true)}
                            disabled={!!busy}
                          >
                            {busy === `review:${obj.id}:true` ? "Approving..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            className="bg-accent text-white text-sm"
                            onClick={() => submitReview(obj.id, false)}
                            disabled={!!busy}
                          >
                            {busy === `review:${obj.id}:false` ? "Rejecting..." : "Reject"}
                          </button>
                          <button
                            type="button"
                            className="border text-sm"
                            onClick={() => { setReviewingId(null); setReviewComment(""); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="bg-primary text-white text-sm"
                        onClick={() => { setReviewingId(obj.id); setExpandedId(obj.id); }}
                      >
                        Review
                      </button>
                    )
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {message ? <p className="text-sm text-emerald-700 font-medium">{message}</p> : null}
      {error ? <p className="text-sm text-red-700 font-medium">{error}</p> : null}
    </div>
  );
}
