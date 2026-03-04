"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmailButton } from "@/components/EmailButton";

type CompletionRow = {
  id: string;
  studentName: string;
  studentEmail: string;
  status: string;
  submittedAt: string | null;
  evidenceReference: string | null;
};

export function CareersActivityReviewTable({ activityId, rows }: { activityId: string; rows: CompletionRow[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(completionId: string, decision: "APPROVED" | "REJECTED") {
    setError(null);
    setLoadingId(completionId + decision);

    const response = await fetch(`/api/careers/activities/${activityId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completionId, decision, comment: decision === "REJECTED" ? "Please improve evidence detail." : "Approved." })
    });

    setLoadingId(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not review completion.");
      return;
    }

    router.refresh();
  }

  return (
    <section className="rounded border bg-white p-4 space-y-3">
      <h3 className="text-lg font-semibold">Review Submissions</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-600">No submissions yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <article key={row.id} className="rounded border p-3 text-sm space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">
                  {row.studentName} ({row.studentEmail})
                </p>
                <EmailButton email={row.studentEmail} subject={`Careers Activity Update`} />
              </div>
              <p>Status: {row.status.toLowerCase().replaceAll("_", " ")}</p>
              <p>Submitted: {row.submittedAt ? new Date(row.submittedAt).toLocaleDateString("en-GB") : "-"}</p>
              <p>Evidence: {row.evidenceReference ?? "-"}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="bg-emerald-600 text-white"
                  onClick={() => review(row.id, "APPROVED")}
                  disabled={loadingId !== null}
                >
                  {loadingId === row.id + "APPROVED" ? "Approving..." : "Approve"}
                </button>
                <button
                  type="button"
                  className="bg-rose-600 text-white"
                  onClick={() => review(row.id, "REJECTED")}
                  disabled={loadingId !== null}
                >
                  {loadingId === row.id + "REJECTED" ? "Rejecting..." : "Reject"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
