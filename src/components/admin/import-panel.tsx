"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { applyImportAction, previewImportAction } from "@/server/admin/actions";
import type { AdminImportPreview } from "@/server/admin/import";

const example = `{
  "subjects": [{ "id": "physics", "name": "Physics", "description": "Physics for NEET.", "order": 1 }],
  "chapters": [{ "id": "physics-example", "subjectId": "physics", "slug": "example", "name": "Example chapter", "description": "Replace this example.", "order": 99 }],
  "topics": [],
  "questions": []
}`;

export function JsonImportPanel() {
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<AdminImportPreview | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string; details?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const validate = () => startTransition(async () => {
    const result = await previewImportAction(raw);
    setMessage({ ok: result.ok, text: result.message, details: result.ok ? undefined : result.fieldErrors?.import });
    setPreview(result.ok ? result.data ?? null : null);
  });
  const apply = () => {
    if (!preview || !window.confirm("Apply this validated content bundle? Existing matching import IDs will be updated.")) return;
    startTransition(async () => {
      const result = await applyImportAction(raw);
      const details = result.ok
        ? result.data
          ? `${result.data.questionsCreated} created, ${result.data.questionsUpdated} updated, ${result.data.subjectsCreated + result.data.chaptersCreated + result.data.topicsCreated} hierarchy additions.`
          : undefined
        : result.fieldErrors?.import;
      setMessage({ ok: result.ok, text: result.message, details });
      if (result.ok) setPreview(null);
    });
  };

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
    <section className="border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Paste only</p><h2 className="mt-1 text-xl font-black">Structured content JSON</h2></div><button type="button" onClick={() => { setRaw(example); setPreview(null); }} className="text-sm font-bold text-emerald-700 hover:text-emerald-900">Load format example</button></div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Use the same subject, chapter, topic, and question structure as the repository content files, combined under one JSON object. Every referenced hierarchy item must be included in the bundle.</p>
      <label className="mt-5 block"><span className="sr-only">Content JSON</span><textarea value={raw} onChange={(event) => { setRaw(event.target.value); setPreview(null); setMessage(null); }} spellCheck={false} placeholder="Paste a content bundle…" className="min-h-[32rem] w-full resize-y border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-6 text-emerald-100 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" /></label>
      <div className="mt-4 flex flex-wrap items-center gap-3"><Button type="button" onClick={validate} disabled={isPending || !raw.trim()}>{isPending ? "Validating…" : "Validate and preview"}</Button><span className="text-xs text-slate-500">Maximum 500 KB and 200 questions per import.</span></div>
    </section>

    <aside className="space-y-5 xl:sticky xl:top-8 xl:self-start">
      <section className="border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Safety model</p><ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600"><li>• Full validation before any write</li><li>• One database transaction</li><li>• Idempotent updates by <code className="bg-slate-100 px-1">importId</code></li><li>• No file-system, shell, or code execution</li><li>• Server-verified ADMIN session</li></ul></section>
      {message ? <section role="status" className={`border p-4 ${message.ok ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-red-300 bg-red-50 text-red-950"}`}><p className="font-bold">{message.text}</p>{message.details ? <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs leading-5">{message.details}</pre> : null}</section> : null}
      {preview ? <section className="border border-emerald-300 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">Validated preview</p><dl className="mt-4 grid grid-cols-2 gap-3">{[
        ["Questions", preview.counts.questions], ["Create", preview.counts.questionsToCreate], ["Update", preview.counts.questionsToUpdate], ["Hierarchy additions", preview.counts.hierarchyAdditions], ["Subjects", preview.counts.subjects], ["Chapters / topics", `${preview.counts.chapters} / ${preview.counts.topics}`],
      ].map(([label, value]) => <div key={label} className="bg-slate-50 p-3"><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 text-xl font-black">{value}</dd></div>)}</dl>{preview.warnings.map((warning) => <p key={warning} className="mt-4 border-l-4 border-amber-400 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-950">{warning}</p>)}<Button type="button" className="mt-5 w-full" onClick={apply} disabled={isPending}>{isPending ? "Applying…" : "Confirm and apply import"}</Button><p className="mt-2 text-center text-xs text-slate-500">The JSON is revalidated on confirmation.</p></section> : null}
    </aside>
  </div>;
}
