"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createQuestionAction, updateQuestionAction } from "@/server/admin/actions";

type Taxonomy = Array<{
  id: string;
  name: string;
  slug: string;
  chapters: Array<{
    id: string;
    subjectId: string;
    name: string;
    slug: string;
    topics: Array<{ id: string; chapterId: string; name: string; slug: string }>;
  }>;
}>;

type FormValue = {
  subjectId: string;
  chapterId: string;
  topicId: string | null;
  questionText: string;
  explanation: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  sourceType: "ORIGINAL" | "PYQ" | "SAMPLE";
  examYear: number | null;
  positiveMarks: number;
  negativeMarks: number;
  order: number;
  isPublished: boolean;
  options: Array<{ label: "A" | "B" | "C" | "D"; text: string; isCorrect: boolean }>;
};

const control = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";
const labels = ["A", "B", "C", "D"] as const;

function defaultValue(taxonomy: Taxonomy): FormValue {
  const subject = taxonomy[0];
  const chapter = subject?.chapters[0];
  return {
    subjectId: subject?.id ?? "",
    chapterId: chapter?.id ?? "",
    topicId: null,
    questionText: "",
    explanation: "",
    difficulty: "MEDIUM",
    sourceType: "ORIGINAL",
    examYear: null,
    positiveMarks: 4,
    negativeMarks: 1,
    order: 0,
    isPublished: false,
    options: labels.map((label, index) => ({ label, text: "", isCorrect: index === 0 })),
  };
}

export function QuestionForm({
  taxonomy,
  questionId,
  initialValue,
}: {
  taxonomy: Taxonomy;
  questionId?: string;
  initialValue?: FormValue;
}) {
  const router = useRouter();
  const [value, setValue] = useState<FormValue>(initialValue ?? defaultValue(taxonomy));
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const subject = taxonomy.find((item) => item.id === value.subjectId);
  const chapter = subject?.chapters.find((item) => item.id === value.chapterId);
  const topics = chapter?.topics ?? [];
  const years = useMemo(() => Array.from({ length: new Date().getFullYear() - 2012 }, (_, index) => new Date().getFullYear() - index), []);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = <K extends keyof FormValue>(key: K, next: FormValue[K]) => {
    setDirty(true);
    setValue((current) => ({ ...current, [key]: next }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  };

  const submit = () => {
    setMessage(null);
    startTransition(async () => {
      const result = questionId
        ? await updateQuestionAction(questionId, value)
        : await createQuestionAction(value);
      setMessage({ ok: result.ok, text: result.message });
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setDirty(false);
      if (!questionId && result.data) router.push(`/admin/questions/${result.data.id}/edit?created=1`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-6">
        <section className="border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">Academic placement</h2><Badge tone="blue">Hierarchy checked on server</Badge></div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="text-sm font-bold">Subject
              <select className={control} value={value.subjectId} onChange={(event) => {
                const nextSubject = taxonomy.find((item) => item.id === event.target.value);
                update("subjectId", event.target.value);
                update("chapterId", nextSubject?.chapters[0]?.id ?? "");
                update("topicId", null);
              }}>
                {taxonomy.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>{fieldErrors.subjectId ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.subjectId}</span> : null}
            </label>
            <label className="text-sm font-bold">Chapter
              <select className={control} value={value.chapterId} onChange={(event) => { update("chapterId", event.target.value); update("topicId", null); }}>
                <option value="">Choose chapter</option>
                {subject?.chapters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>{fieldErrors.chapterId ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.chapterId}</span> : null}
            </label>
            <label className="text-sm font-bold">Topic <span className="font-normal text-slate-400">(optional)</span>
              <select className={control} value={value.topicId ?? ""} onChange={(event) => update("topicId", event.target.value || null)} disabled={!topics.length}>
                <option value="">No topic</option>
                {topics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>{fieldErrors.topicId ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.topicId}</span> : null}
            </label>
          </div>
        </section>

        <section className="border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-black">Question and explanation</h2>
          <label className="mt-5 block text-sm font-bold">Question text
            <textarea className={`${control} min-h-32 resize-y leading-6`} maxLength={5000} value={value.questionText} onChange={(event) => update("questionText", event.target.value)} placeholder="Write a precise, self-contained question…" />
            {fieldErrors.questionText ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.questionText}</span> : null}
          </label>
          <label className="mt-5 block text-sm font-bold">Detailed explanation
            <textarea className={`${control} min-h-36 resize-y leading-6`} maxLength={10000} value={value.explanation} onChange={(event) => update("explanation", event.target.value)} placeholder="Explain why the correct option is right and resolve likely misconceptions…" />
            {fieldErrors.explanation ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.explanation}</span> : null}
          </label>
        </section>

        <section className="border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><h2 className="text-lg font-black">Answer options</h2><p className="mt-1 text-sm text-slate-500">Exactly four options and one correct answer.</p></div><span className="text-xs font-bold uppercase tracking-wide text-slate-400">A–D fixed order</span></div>
          <fieldset className="mt-5 space-y-3">
            <legend className="sr-only">Answer options and correct answer</legend>
            {value.options.map((option, index) => (
              <div key={option.label} className={`grid gap-3 border p-3 transition sm:grid-cols-[3rem_minmax(0,1fr)_9rem] sm:items-center ${option.isCorrect ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50/60"}`}>
                <span className={`grid size-10 place-items-center font-black ${option.isCorrect ? "bg-emerald-700 text-white" : "bg-white text-slate-700"}`}>{option.label}</span>
                <label><span className="sr-only">Option {option.label} text</span><input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" maxLength={1000} value={option.text} onChange={(event) => {
                  const options = [...value.options]; options[index] = { ...option, text: event.target.value }; update("options", options);
                }} /></label>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700"><input type="radio" name="correctOption" checked={option.isCorrect} onChange={() => update("options", value.options.map((item, optionIndex) => ({ ...item, isCorrect: optionIndex === index })))} className="size-4 accent-emerald-700" />Correct answer</label>
              </div>
            ))}
          </fieldset>
          {(fieldErrors.options || fieldErrors.correctOption) ? <p className="mt-2 text-sm font-semibold text-red-700">{fieldErrors.options || fieldErrors.correctOption}</p> : null}
        </section>
      </div>

      <aside className="space-y-5 xl:sticky xl:top-8 xl:self-start">
        <section className="border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black">Question settings</h2>
          <div className="mt-4 space-y-4">
            <label className="block text-sm font-bold">Difficulty<select className={control} value={value.difficulty} onChange={(event) => update("difficulty", event.target.value as FormValue["difficulty"])}><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select></label>
            <label className="block text-sm font-bold">Source<select className={control} value={value.sourceType} onChange={(event) => { const source = event.target.value as FormValue["sourceType"]; update("sourceType", source); if (source !== "PYQ") update("examYear", null); }}><option value="ORIGINAL">Original</option><option value="SAMPLE">Sample</option><option value="PYQ">Verified PYQ</option></select></label>
            {value.sourceType === "PYQ" ? <label className="block text-sm font-bold">Verified exam year<select className={control} value={value.examYear ?? ""} onChange={(event) => update("examYear", event.target.value ? Number(event.target.value) : null)}><option value="">Choose year</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select>{fieldErrors.examYear ? <span className="mt-1 block text-xs text-red-700">{fieldErrors.examYear}</span> : null}</label> : null}
            <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-bold">Positive<input type="number" min={1} max={20} className={control} value={value.positiveMarks} onChange={(event) => update("positiveMarks", Number(event.target.value))} /></label><label className="block text-sm font-bold">Negative<input type="number" min={0} max={20} className={control} value={value.negativeMarks} onChange={(event) => update("negativeMarks", Number(event.target.value))} /></label></div>
            <label className="block text-sm font-bold">Display order<input type="number" min={0} className={control} value={value.order} onChange={(event) => update("order", Number(event.target.value))} /></label>
            <label className="flex items-start gap-3 border border-slate-200 bg-slate-50 p-3"><input type="checkbox" className="mt-0.5 size-4 accent-emerald-700" checked={value.isPublished} onChange={(event) => update("isPublished", event.target.checked)} /><span><span className="block text-sm font-bold">Published</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">Available to public questions and new sessions.</span></span></label>
          </div>
        </section>
        <section className="border-l-4 border-amber-400 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Provenance matters.</strong><br />Only mark a question as PYQ when its source and exam year have been independently verified.</section>
        {message ? <div role="status" className={`border p-3 text-sm font-semibold ${message.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900"}`}>{message.text}</div> : null}
        <Button type="submit" className="w-full" disabled={isPending}>{isPending ? "Saving…" : questionId ? "Save changes" : "Create question"}</Button>
        {dirty ? <p className="text-center text-xs font-semibold text-amber-700">You have unsaved changes.</p> : null}
      </aside>
    </form>
  );
}
