"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CareersActivitySubmitForm({ activityId, initialEvidence }: { activityId: string; initialEvidence?: string | null }) {
  const router = useRouter();
  const [evidenceReference, setEvidenceReference] = useState(initialEvidence ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const response = await fetch(`/api/careers/activities/${activityId}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ evidenceReference })
    });

    setLoading(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not submit activity.");
      return;
    }

    setMessage("Submitted successfully.");
    router.refresh();
  }

  return (
    <section className="rounded border bg-white p-4 space-y-3">
      <h3 className="text-lg font-semibold">Submit Activity Evidence</h3>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Evidence Reference (URL or object key)</label>
          <input value={evidenceReference} onChange={(e) => setEvidenceReference(e.target.value)} required />
        </div>
        <button className="bg-primary text-white" disabled={loading} type="submit">
          {loading ? "Submitting..." : "Submit Activity"}
        </button>
      </form>
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
