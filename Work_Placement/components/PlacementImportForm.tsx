"use client";

import { FormEvent, useState } from "react";

type ImportResult = {
  created: number;
  skipped: number;
  errors: string[];
};

export function PlacementImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a CSV or Excel file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/placements/import", {
      method: "POST",
      body: formData
    });

    setLoading(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Import failed.");
      return;
    }

    setResult((await response.json()) as ImportResult);
  }

  return (
    <section className="rounded border bg-white p-4 space-y-3">
      <h3 className="text-lg font-semibold">Bulk Placement Upload (CSV/Excel)</h3>
      <p className="text-sm text-slate-600">
        Required columns: <code>Student Number</code>, <code>Student name</code>, <code>Student Email</code>,
        <code> Employer Name</code>, <code>Employer Contact</code>, <code>Employer Email</code>,
        <code> Employer Phone Number</code>, <code>startDate</code>, <code>endDate</code>, <code>Target Hours</code>.
      </p>
      <p className="text-sm text-slate-600">
        Optional columns: <code>Year Group</code>, <code>Tutor Group</code>. Missing students are created automatically.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="submit" className="bg-primary text-white" disabled={loading}>
          {loading ? "Importing..." : "Upload Placements"}
        </button>
      </form>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {result ? (
        <div className="text-sm space-y-1">
          <p>Created: {result.created}</p>
          <p>Skipped: {result.skipped}</p>
          {result.errors.length > 0 ? (
            <ul className="list-disc pl-5 text-red-700">
              {result.errors.slice(0, 10).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
