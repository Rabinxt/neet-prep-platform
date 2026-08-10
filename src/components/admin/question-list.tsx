"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  bulkSetQuestionPublicationAction,
  deleteQuestionAction,
  setQuestionPublicationAction,
} from "@/server/admin/actions";

type QuestionRow = {
  id: string;
  questionText: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  sourceType: "ORIGINAL" | "PYQ" | "SAMPLE";
  examYear: number | null;
  isPublished: boolean;
  updatedAt: string;
  subject: { id: string; name: string };
  chapter: { id: string; name: string };
  topic: { id: string; name: string } | null;
};

export function AdminQuestionList({ questions }: { questions: QuestionRow[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const allSelected = questions.length > 0 && questions.every((item) => selected.includes(item.id));

  const mutate = (task: () => Promise<{ ok: boolean; message: string }>) => startTransition(async () => {
    const result = await task();
    setMessage(result.message);
    if (result.ok) {
      setSelected([]);
      window.location.reload();
    }
  });

  return <div>
    <div className="flex min-h-12 flex-wrap items-center gap-2 border-x border-t border-slate-200 bg-slate-950 px-3 py-2 text-white">
      <label className="flex items-center gap-2 px-2 text-sm font-semibold"><input type="checkbox" className="size-4 accent-emerald-500" checked={allSelected} onChange={(event) => setSelected(event.target.checked ? questions.map((item) => item.id) : [])} /> Select page</label>
      <span className="text-xs text-slate-400">{selected.length} selected</span>
      <div className="ml-auto flex gap-2"><Button size="sm" variant="secondary" disabled={!selected.length || isPending} onClick={() => mutate(() => bulkSetQuestionPublicationAction(selected, true))}>Publish</Button><Button size="sm" variant="secondary" disabled={!selected.length || isPending} onClick={() => mutate(() => bulkSetQuestionPublicationAction(selected, false))}>Unpublish</Button></div>
    </div>
    {message ? <p role="status" className="border-x border-t border-slate-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900">{message}</p> : null}
    <div className="divide-y divide-slate-200 border border-slate-200 bg-white">
      {questions.length ? questions.map((question) => (
        <article key={question.id} className="grid gap-4 p-4 transition hover:bg-slate-50/70 lg:grid-cols-[2rem_minmax(0,1fr)_10rem_10rem] lg:items-center">
          <input aria-label={`Select question: ${question.questionText.slice(0, 50)}`} type="checkbox" className="size-4 accent-emerald-700" checked={selected.includes(question.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, question.id] : current.filter((id) => id !== question.id))} />
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-1.5"><Badge tone={question.isPublished ? "green" : "amber"}>{question.isPublished ? "Published" : "Draft"}</Badge><Badge tone={question.difficulty === "HARD" ? "red" : question.difficulty === "EASY" ? "green" : "blue"}>{question.difficulty}</Badge><Badge tone="violet">{question.sourceType}{question.examYear ? ` · ${question.examYear}` : ""}</Badge></div>
            <h2 className="line-clamp-2 font-bold leading-6 text-slate-950">{question.questionText}</h2>
            <p className="mt-1 truncate text-xs text-slate-500">{question.subject.name} / {question.chapter.name}{question.topic ? ` / ${question.topic.name}` : ""}</p>
          </div>
          <div className="text-xs text-slate-500"><span className="block font-bold uppercase tracking-wide text-slate-400">Updated</span><span className="mt-1 block">{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(question.updatedAt))}</span></div>
          <div className="flex flex-wrap justify-start gap-1 lg:justify-end">
            <Link href={`/admin/questions/${question.id}/edit`} className="rounded-lg px-2.5 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50">Edit</Link>
            <button disabled={isPending} onClick={() => mutate(() => setQuestionPublicationAction(question.id, !question.isPublished))} className="rounded-lg px-2.5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">{question.isPublished ? "Unpublish" : "Publish"}</button>
            <button disabled={isPending} onClick={() => { if (window.confirm("Delete this live question? Historical attempt snapshots will be preserved, but this cannot be undone.")) mutate(() => deleteQuestionAction(question.id)); }} className="rounded-lg px-2.5 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">Delete</button>
          </div>
        </article>
      )) : <div className="p-12 text-center"><p className="font-bold text-slate-800">No questions match these filters.</p><p className="mt-1 text-sm text-slate-500">Try clearing one or more filters.</p></div>}
    </div>
  </div>;
}

