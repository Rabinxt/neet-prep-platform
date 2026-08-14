"use client";

import { useMemo, useState, useTransition } from "react";
import { applyCsvImportAction, previewCsvImportAction } from "@/server/admin/actions";
import type { CsvImportPreview, CsvRowStatus } from "@/server/admin/csv-import";
import { Button } from "@/components/ui/button";

const template = `importId,subjectSlug,chapterSlug,topicSlug,difficulty,questionText,optionA,optionB,optionC,optionD,correctOption,explanation,source,sourceType,positiveMarks,negativeMarks,isPublished,publicationStatus,questionId,order,examYear\nneet-sample-cell-energy,biology,cell-the-unit-of-life,cell-organelles,EASY,"Which organelle releases usable energy for the cell?",Golgi apparatus,Mitochondrion,Lysosome,Ribosome,B,"Mitochondria produce ATP during cellular respiration.",ORIGINAL,ORIGINAL,4,1,false,DRAFT,,1,`;
const PAGE_SIZE = 25;

type Filter = "ALL" | "READY" | "ERROR" | "DUPLICATES" | "WARNINGS";

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number) {
  let text = String(value).replace(/\r?\n/g, " ");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

const statusTone: Record<CsvRowStatus, string> = {
  READY: "bg-emerald-50 text-emerald-800",
  ERROR: "bg-red-50 text-red-800",
  DUPLICATE_EXISTING: "bg-slate-100 text-slate-700",
  POSSIBLE_DUPLICATE: "bg-amber-50 text-amber-900",
  WARNING: "bg-yellow-50 text-yellow-900",
};

export function CsvImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvImportPreview | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string; details?: string } | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [acknowledge, setAcknowledge] = useState(false);
  const [result, setResult] = useState<{ created: number; skippedDuplicates: number; warnings: number; failed: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  const chooseFile = (next: File | null) => {
    setFile(next);
    setPreview(null);
    setMessage(null);
    setResult(null);
    setAcknowledge(false);
    setPage(1);
  };

  const validate = () => {
    if (!file) return;
    startTransition(async () => {
      const data = new FormData();
      data.set("file", file);
      const response = await previewCsvImportAction(data);
      setMessage({ ok: response.ok, text: response.message, details: response.ok ? undefined : response.fieldErrors?.csv });
      setPreview(response.ok ? response.data ?? null : null);
      setResult(null);
      setPage(1);
      setAcknowledge(false);
    });
  };

  const apply = () => {
    if (!file || !preview || preview.hasBlockingErrors) return;
    startTransition(async () => {
      const data = new FormData();
      data.set("file", file);
      data.set("acknowledgeWarnings", String(acknowledge));
      const response = await applyCsvImportAction(data);
      setMessage({ ok: response.ok, text: response.message, details: response.ok ? undefined : response.fieldErrors?.csv ?? response.fieldErrors?.import });
      if (response.ok && response.data) {
        setResult(response.data);
        setPreview(null);
      }
    });
  };

  const filteredRows = useMemo(() => (preview?.rows ?? []).filter((row) => {
    const statusMatches = filter === "ALL"
      || row.status === filter
      || (filter === "DUPLICATES" && (row.status === "DUPLICATE_EXISTING" || row.status === "POSSIBLE_DUPLICATE"))
      || (filter === "WARNINGS" && (row.status === "WARNING" || row.status === "POSSIBLE_DUPLICATE"));
    const needle = search.trim().toLowerCase();
    return statusMatches && (!needle || row.importId.toLowerCase().includes(needle) || row.questionPreview.toLowerCase().includes(needle));
  }), [filter, preview, search]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const downloadErrors = () => {
    if (!preview) return;
    const rows = preview.rows.filter((row) => row.status !== "READY");
    downloadCsv([
      "row,importId,status,message",
      ...rows.map((row) => [row.row, row.importId, row.status, row.messages.join(" ")].map(csvCell).join(",")),
    ].join("\r\n"), "neet-import-validation.csv");
  };

  return <section className="space-y-6">
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">01 / Upload</p><h2 className="mt-2 text-2xl font-black tracking-tight">Question CSV</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">One question per row. CSV v1 resolves existing subjects, chapters, and topics only—typos never create hierarchy.</p></div>
          <button type="button" onClick={() => downloadCsv(template, "neet-question-import-template.csv")} className="min-h-11 shrink-0 border border-emerald-700 px-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">Download CSV template</button>
        </div>
        <label className="mt-6 grid min-h-44 cursor-pointer place-items-center border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-emerald-500 hover:bg-emerald-50/40 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-700">
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
          <span><span className="block text-base font-black text-slate-900">Choose a UTF-8 CSV file</span><span className="mt-2 block text-sm text-slate-500">Maximum 1 MB · Maximum 500 question rows</span></span>
        </label>
        {file ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3"><div><p className="font-bold text-emerald-950">{file.name}</p><p className="text-xs text-emerald-800">{(file.size / 1_000).toFixed(1)} KB</p></div><button type="button" onClick={() => chooseFile(null)} className="min-h-11 px-3 text-sm font-bold text-emerald-900 underline underline-offset-4">Remove file</button></div> : null}
        <div className="mt-5 flex flex-wrap items-center gap-3"><Button type="button" onClick={validate} disabled={!file || isPending}>{isPending ? "Validating…" : "Validate and preview"}</Button><span className="text-xs text-slate-500">Server-side parsing and validation only.</span></div>
      </div>

      <aside className="border border-slate-200 bg-slate-950 p-6 text-slate-100 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Safety contract</p>
        <ol className="mt-5 space-y-4 text-sm leading-6 text-slate-300"><li><b className="text-white">1.</b> Strict parse and expected columns</li><li><b className="text-white">2.</b> Shared question rules</li><li><b className="text-white">3.</b> Existing hierarchy resolution</li><li><b className="text-white">4.</b> Duplicate preflight</li><li><b className="text-white">5.</b> Explicit confirmation</li><li><b className="text-white">6.</b> One atomic transaction</li></ol>
      </aside>
    </div>

    {message ? <div role="status" className={`border-l-4 p-4 ${message.ok ? "border-emerald-500 bg-emerald-50 text-emerald-950" : "border-red-500 bg-red-50 text-red-950"}`}><p className="font-bold">{message.text}</p>{message.details ? <p className="mt-1 whitespace-pre-wrap text-sm">{message.details}</p> : null}</div> : null}

    {result ? <div className="border border-emerald-300 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Import complete</p><h2 className="mt-2 text-2xl font-black">Content safely applied.</h2><dl className="mt-5 grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-4">{Object.entries(result).map(([label, value]) => <div key={label} className="bg-white p-4"><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label.replace(/([A-Z])/g, " $1")}</dt><dd className="mt-1 text-2xl font-black">{value}</dd></div>)}</dl></div> : null}

    {preview ? <div className="border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5 sm:p-7"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">02 / Review</p><div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-black">Validated impact</h2><p className="mt-1 text-sm text-slate-500">{preview.filename} · {preview.counts.total} detected rows</p></div>{preview.rows.some((row) => row.status !== "READY") ? <button type="button" onClick={downloadErrors} className="min-h-11 border border-slate-300 px-4 text-sm font-bold hover:bg-slate-50">Download validation report</button> : null}</div>
        <dl className="mt-6 grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-4 lg:grid-cols-8">{[
          ["Total", preview.counts.total], ["Valid", preview.counts.valid], ["Errors", preview.counts.errors], ["New", preview.counts.newQuestions], ["Existing", preview.counts.existingDuplicates], ["Possible", preview.counts.possibleDuplicates], ["Warnings", preview.counts.warnings], ["Skipped", preview.counts.skipped],
        ].map(([label, value]) => <div key={label} className="bg-white p-3"><dt className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-xl font-black">{value}</dd></div>)}</dl>
      </div>
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap gap-2">{(["ALL", "READY", "ERROR", "DUPLICATES", "WARNINGS"] as Filter[]).map((item) => <button key={item} type="button" onClick={() => { setFilter(item); setPage(1); }} className={`min-h-10 border px-3 text-xs font-black ${filter === item ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-slate-500"}`}>{item}</button>)}</div><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search importId or question" aria-label="Search preview rows" className="min-h-11 w-full border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 sm:max-w-xs" /></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[64rem] text-left text-sm"><thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-300"><tr><th className="p-3">Row</th><th className="p-3">Import ID</th><th className="p-3">Hierarchy</th><th className="p-3">Question</th><th className="p-3">Level</th><th className="p-3">Status</th><th className="p-3">Message</th></tr></thead><tbody className="divide-y divide-slate-200">{pageRows.map((row) => <tr key={`${row.row}-${row.importId}`}><td className="p-3 font-mono text-xs">{row.row}</td><td className="p-3 font-mono text-xs font-bold">{row.importId || "—"}</td><td className="p-3 text-xs text-slate-600">{row.subject}<br />{row.chapter}<br />{row.topic}</td><td className="max-w-md p-3 font-semibold">{row.questionPreview || "—"}</td><td className="p-3 text-xs font-bold">{row.difficulty || "—"}</td><td className="p-3"><span className={`inline-flex px-2 py-1 text-[0.65rem] font-black ${statusTone[row.status]}`}>{row.status}</span></td><td className="max-w-sm p-3 text-xs leading-5 text-slate-600">{row.messages.join(" ") || "Ready to create."}</td></tr>)}</tbody></table></div>
      <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4"><p className="text-xs text-slate-500">Showing {pageRows.length} of {filteredRows.length} matching rows.</p><div className="flex items-center gap-2"><button type="button" className="min-h-10 border px-3 text-sm font-bold disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span className="text-xs font-bold">{page} / {pageCount}</span><button type="button" className="min-h-10 border px-3 text-sm font-bold disabled:opacity-40" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>
      <div className="border-t border-slate-200 bg-slate-50 p-5 sm:p-7"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">03 / Confirm</p><p className="mt-2 text-lg font-black">{preview.counts.newQuestions} questions will be created. {preview.counts.existingDuplicates} existing import IDs will be skipped.</p>{preview.requiresWarningAcknowledgement ? <label className="mt-4 flex min-h-12 cursor-pointer items-start gap-3 border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-950"><input type="checkbox" checked={acknowledge} onChange={(event) => setAcknowledge(event.target.checked)} className="mt-1 size-4 accent-amber-700" /><span>I reviewed the possible duplicates and warnings and want to continue.</span></label> : null}<Button type="button" className="mt-5" onClick={apply} disabled={isPending || preview.hasBlockingErrors || (preview.requiresWarningAcknowledgement && !acknowledge) || preview.counts.newQuestions === 0}>{isPending ? "Importing…" : "Confirm and import questions"}</Button>{preview.hasBlockingErrors ? <p className="mt-2 text-sm font-semibold text-red-700">Import is disabled until every ERROR row is corrected.</p> : null}<p className="mt-2 text-xs text-slate-500">The file, hierarchy, and import IDs are revalidated immediately before the atomic transaction.</p></div>
    </div> : null}
  </section>;
}
