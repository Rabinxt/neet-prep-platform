"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SubjectIcon, getSubjectTheme } from "@/components/subjects/subject-visual";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { PracticeTaxonomy } from "@/server/questions/queries";

type Selection = {
  subjectId: string;
  chapterId: string;
  topicId: string;
};

export function QuestionFilters({ taxonomy, initial, resultCount }: { taxonomy: PracticeTaxonomy; initial: { subjectSlug?: string; chapterId?: string; topicId?: string; difficulty?: string; examYear?: number }; resultCount: number }) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const initialSubject = taxonomy.find((item) => item.slug === initial.subjectSlug) ?? taxonomy[0];
  const [selection, setSelection] = useState<Selection>({ subjectId: initialSubject?.id ?? "", chapterId: initial.chapterId ?? "", topicId: initial.topicId ?? "" });
  const [difficulty, setDifficulty] = useState(initial.difficulty ?? "");
  const [examYear, setExamYear] = useState(initial.examYear ? String(initial.examYear) : "");
  const subject = useMemo(() => taxonomy.find((item) => item.id === selection.subjectId), [selection.subjectId, taxonomy]);
  const activeChapter = subject?.chapters.find((item) => item.id === selection.chapterId);
  const subjectTone = getSubjectTheme(subject?.slug ?? "biology");

  function navigate(next: Selection, nextDifficulty = difficulty, nextYear = examYear) {
    const nextSubject = taxonomy.find((item) => item.id === next.subjectId);
    if (!nextSubject) return;

    setSelection(next);
    const params = new URLSearchParams({ subject: nextSubject.slug });
    if (next.chapterId) params.set("chapter", next.chapterId);
    if (next.topicId) params.set("topic", next.topicId);
    if (nextDifficulty) params.set("difficulty", nextDifficulty);
    if (nextYear) params.set("year", nextYear);
    startTransition(() => router.push(`/questions?${params.toString()}`));
  }

  return (
    <section className={cn("transition-opacity", isNavigating && "opacity-70")} aria-label="Question Bank syllabus browser" aria-busy={isNavigating}>
      <fieldset>
        <legend className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Choose a subject mode</legend>
        <div className="mt-4 grid border-y border-slate-300 sm:grid-cols-3">
          {taxonomy.map((item, index) => {
            const theme = getSubjectTheme(item.slug);
            const selected = selection.subjectId === item.id;
            return (
              <label key={item.id} className={cn("group relative flex min-h-24 cursor-pointer items-center gap-4 border-b border-slate-300 px-4 py-5 transition-[background-color,border-color,transform] duration-200 focus-within:outline-2 focus-within:outline-offset-[-2px] focus-within:outline-emerald-600 active:scale-[0.99] last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0", selected ? theme.soft : "bg-white/45 hover:border-slate-400 hover:bg-white/90")}>
                <input type="radio" name="question-subject" value={item.id} checked={selected} onChange={() => navigate({ subjectId: item.id, chapterId: "", topicId: "" })} className="sr-only" />
                {selected ? <span className={cn("active-travel absolute inset-y-0 left-0 w-1 origin-center", theme.glow)} /> : null}
                <span className="font-mono text-[10px] font-bold text-slate-400">0{index + 1}</span>
                <SubjectIcon slug={item.slug} className={cn("size-8 transition-transform duration-300 group-hover:scale-105", selected ? theme.accent : "text-slate-400")} />
                <span><strong className={cn("block text-xl tracking-[-0.025em]", selected ? "text-slate-950" : "text-slate-700")}>{item.name}</strong><span className="mt-1 block text-xs text-slate-500">{selected ? "Selected mode" : `${item.chapters.length} chapters`}</span></span>
                <ArrowRightIcon className={cn("interaction-arrow ml-auto size-4", selected ? theme.accent : "text-slate-400")} />
              </label>
            );
          })}
        </div>
      </fieldset>

      <div key={subject?.id} className="subject-reveal grid border-b border-slate-300 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="py-8 lg:border-r lg:border-slate-300 lg:pr-10">
          <div className="flex items-end justify-between gap-5">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Syllabus map</p><h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">{subject?.name ?? "Subject"}</h2></div>
            <p className="text-right text-xs text-slate-500"><strong className="font-mono text-xl text-slate-950">{resultCount}</strong><br />questions in view</p>
          </div>

          <div className="mt-7 border-t border-slate-300">
            <button type="button" aria-current={!selection.chapterId ? "page" : undefined} onClick={() => navigate({ subjectId: selection.subjectId, chapterId: "", topicId: "" })} className={cn("group relative grid min-h-14 w-full cursor-pointer grid-cols-[1.5rem_1fr_auto] items-center gap-3 border-b border-slate-200 px-3 text-left transition-[background-color,padding] duration-200 focus-visible:outline-2 focus-visible:outline-emerald-600", !selection.chapterId ? cn(subjectTone.soft, "pl-5") : "bg-white/40 hover:bg-white")}>
              {!selection.chapterId ? <span className={cn("active-travel absolute inset-y-0 left-0 w-1", subjectTone.glow)} /> : null}<span className="font-mono text-[10px] text-slate-400">00</span><span className="font-bold text-slate-900">All {subject?.name} questions</span><span className={cn("inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider", !selection.chapterId ? subjectTone.accent : "text-slate-500")}>{!selection.chapterId ? "Selected" : "Open"}<ArrowRightIcon className="interaction-arrow size-4" /></span>
            </button>
            {subject?.chapters.map((chapter, index) => {
              const selected = selection.chapterId === chapter.id;
              return (
                <div key={chapter.id} className="border-b border-slate-200">
                  <button type="button" aria-expanded={selected} onClick={() => navigate({ subjectId: selection.subjectId, chapterId: chapter.id, topicId: "" })} className={cn("group relative grid min-h-16 w-full cursor-pointer grid-cols-[1.5rem_1fr_auto] items-center gap-3 px-3 text-left transition-[background-color,padding] duration-200 focus-visible:outline-2 focus-visible:outline-emerald-600 active:scale-[0.995]", selected ? cn(subjectTone.soft, "pl-5") : "bg-white/35 hover:bg-white")}>
                    {selected ? <span className={cn("active-travel absolute inset-y-0 left-0 w-1", subjectTone.glow)} /> : null}
                    <span className="font-mono text-[10px] text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                    <span><strong className={cn("block text-sm", selected ? "text-slate-950" : "text-slate-700")}>{chapter.name}</strong><span className="mt-1 block text-xs text-slate-400">{chapter.topics.length ? `${chapter.topics.length} topics` : "Chapter questions"}</span></span>
                    <span className={cn("grid size-8 place-items-center border border-slate-300 bg-white text-lg font-bold text-slate-600 transition-[background-color,border-color,transform] duration-200 group-hover:border-slate-500", selected && cn(subjectTone.accent, subjectTone.border))} aria-hidden="true">{selected ? "−" : "+"}</span>
                  </button>
                  {selected && chapter.topics.length ? (
                    <div className="syllabus-reveal ml-6 border-l border-slate-300 pb-3 sm:ml-10">
                      <button type="button" onClick={() => navigate({ subjectId: selection.subjectId, chapterId: chapter.id, topicId: "" })} className={cn("flex min-h-11 w-full cursor-pointer items-center justify-between border-l-2 py-2 pl-5 pr-3 text-left text-xs font-bold transition-[background-color,color] hover:text-slate-950", !selection.topicId ? cn("-ml-px", subjectTone.border, subjectTone.accent, subjectTone.soft) : "border-transparent bg-white/30 text-slate-600 hover:bg-white")}>All chapter questions<span aria-hidden="true">{!selection.topicId ? "✓" : "→"}</span></button>
                      {chapter.topics.map((topic) => <button key={topic.id} type="button" onClick={() => navigate({ subjectId: selection.subjectId, chapterId: chapter.id, topicId: topic.id })} className={cn("flex min-h-11 w-full cursor-pointer items-center justify-between border-l-2 py-2 pl-5 pr-3 text-left text-xs font-bold transition-[background-color,color] hover:text-slate-950", selection.topicId === topic.id ? cn("-ml-px", subjectTone.border, subjectTone.accent, subjectTone.soft) : "border-transparent bg-white/30 text-slate-600 hover:bg-white")}>{topic.name}<span aria-hidden="true">{selection.topicId === topic.id ? "✓" : "→"}</span></button>)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="py-8 lg:pl-8">
          <div className="lg:sticky lg:top-28">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Refine this view</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">Filters stay secondary to the syllabus. Apply them when you need a tighter set.</p>
            <label className="mt-6 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="mt-2 h-11 w-full cursor-pointer border border-slate-300 bg-white/70 px-3 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400 hover:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"><option value="">Any difficulty</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select></label>
            <label className="mt-5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">PYQ year<input type="number" min="2013" max="2099" inputMode="numeric" value={examYear} onChange={(event) => setExamYear(event.target.value)} placeholder="Any year" className="mt-2 h-11 w-full border border-slate-300 bg-white/70 px-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-colors hover:border-slate-400 hover:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
            <Button type="button" size="sm" className="mt-6 w-full rounded-none" onClick={() => navigate(selection, difficulty, examYear)}>Apply filters</Button>
            <div className="mt-7 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500"><strong className="text-slate-700">Current scope</strong><br />{activeChapter?.name ?? `All ${subject?.name ?? "subject"}`}{selection.topicId ? ` · ${activeChapter?.topics.find((topic) => topic.id === selection.topicId)?.name}` : ""}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
