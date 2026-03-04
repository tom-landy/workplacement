"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CareersActivityCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [yearGroup, setYearGroup] = useState("Year 12");
  const [dueDate, setDueDate] = useState("");
  const [gatsbyTags, setGatsbyTags] = useState("G1,G2");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/careers/activities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        yearGroup,
        dueDate,
        gatsbyTags: gatsbyTags.split(",").map((v) => v.trim()).filter(Boolean)
      })
    });

    setLoading(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not create activity.");
      return;
    }

    setTitle("");
    setDescription("");
    setDueDate("");
    setGatsbyTags("G1,G2");
    router.refresh();
  }

  return (
    <section className="rounded border bg-white p-4 space-y-3">
      <h3 className="text-lg font-semibold">Create Careers Activity</h3>
      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={3} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Year Group</label>
          <input value={yearGroup} onChange={(e) => setYearGroup(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Due Date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium">Gatsby Tags (comma separated)</label>
          <input value={gatsbyTags} onChange={(e) => setGatsbyTags(e.target.value)} placeholder="G1,G4" required />
        </div>
        <div className="md:col-span-2">
          <button className="bg-primary text-white" disabled={loading} type="submit">
            {loading ? "Creating..." : "Create Activity"}
          </button>
        </div>
      </form>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
