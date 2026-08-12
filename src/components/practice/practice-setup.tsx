"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { SubjectIcon, getSubjectTheme } from "@/components/subjects/subject-visual";
import { SubjectMotif } from "@/components/subjects/subject-motif";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowRightIcon, BookIcon, CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { startPracticeAttempt } from "@/server/attempts/actions";
import type { ActiveAttemptSummary } from "@/server/attempts/types";
import type { PracticeQuestionCount, PracticeTaxonomy } from "@/server/questions/queries";

const questionCounts: Array<{ value: PracticeQuestionCount; label: string; note: string }> = [
  { value: 5, label: "05", note: "quick focus" },
  { value: 10, label: "10", note: "steady set" },
  { value: 20, label: "20", note: "deep session" },
  { value: "all", label: "ALL", note: "full pool" },
];

const difficultyOptions = [
  { value: "", label: "Any", note: "mixed challenge" },
  { value: "EASY", label: "Easy", note: "build fluency" },
  { value: "MEDIUM", label: "Medium", note: "test recall" },
  { value: "HARD", label: "Hard", note: "stretch thinking" },
];

export function PracticeSetup({ taxonomy, activeAttempt }: { taxonomy: PracticeTaxonomy; activeAttempt: ActiveAttemptSummary | null }) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(taxonomy[0]?.id ?? "");
  const [chapterId, setChapterId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [count, setCount] = useState<PracticeQuestionCount>(5);
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const subject = useMemo(() => taxonomy.find((item) => item.id === subjectId), [subjectId, taxonomy]);
  const chapter = subject?.chapters.find((item) => item.id === chapterId);
  const tone = getSubjectTheme(subject?.slug ?? "biology");

  function changeSubject(nextSubjectId: string) {
    setSubjectId(nextSubjectId);
    setChapterId("");
    setTopicId("");
  }

  function changeChapter(nextChapterId: string) {
    setChapterId(nextChapterId);
    setTopicId("");
  }

  function startPractice() {
    if (!subjectId || isPending) return;
    setMessage(undefined);
    startTransition(async () => {
      const result = await startPracticeAttempt({ subjectId, chapterId: chapterId || undefined, topicId: topicId || undefined, difficulty: difficulty || undefined, count });
      if (result.status === "invalid") {
        setMessage(result.message);
        return;
      }
      router.push(`/practice/attempt/${result.attemptId}`);
    });
  }

  return (
    <div className="min-h-screen bg-[#f2f6f4]">
      <header className="border-b border-slate-300 bg-[#f2f6f4]"><Container className="flex h-[4.5rem] items-center justify-between"><BrandMark /><ButtonLink href="/" variant="ghost" size="sm">Back to site</ButtonLink></Container></header>

      <main className="relative isolate overflow-hidden">
        <SubjectMotif slug={subject?.slug ?? "biology"} className={cn("absolute -right-40 top-12 w-[48rem] opacity-[0.08] transition-colors", tone.accent)} />
        <Container className="relative py-8 sm:py-12 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-16">
            <aside className="lg:sticky lg:top-8 lg:self-start">
              <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700"><span className="h-px w-9 bg-emerald-500" />Practice composer</p>
              <h1 className="mt-6 text-[clamp(3rem,6vw,5.3rem)] font-black leading-[0.9] tracking-[-0.065em] text-slate-950">Build the session you need <span className={tone.accent}>now.</span></h1>
              <p className="mt-6 max-w-sm text-sm leading-7 text-slate-600">No timer. Immediate explanations. Every choice below shapes one focused learning loop.</p>
              <ol className="mt-10 hidden border-y border-slate-300 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 lg:block">
                <li className="flex justify-between border-b border-slate-200 py-4"><span>01 Focus</span><span className={tone.accent}>Subject</span></li>
                <li className="flex justify-between border-b border-slate-200 py-4"><span>02 Scope</span><span className={chapterId ? tone.accent : "text-slate-400"}>Chapter</span></li>
                <li className="flex justify-between py-4"><span>03 Shape</span><span className={tone.accent}>{count === "all" ? "All" : count} Qs</span></li>
              </ol>
            </aside>

            <div>
              {activeAttempt ? <section className="mb-9 grid gap-4 border-y border-emerald-300 bg-emerald-50/60 py-5 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">A session is waiting</p><h2 className="mt-1 text-xl font-black text-slate-950">{activeAttempt.name}</h2><p className="mt-1 text-sm text-slate-600">Question {activeAttempt.currentQuestionIndex + 1} of {activeAttempt.totalQuestions}</p></div><ButtonLink href={`/practice/attempt/${activeAttempt.id}`} className="rounded-none">Resume <ArrowRightIcon className="size-4" /></ButtonLink></section> : null}
              {message ? <div className="mb-7 border-y border-red-300 bg-red-50 py-4 text-sm text-red-900" role="alert">{message}</div> : null}

              {taxonomy.length === 0 ? <EmptyState icon={<BookIcon />} title="No published practice content is available" description="Check the database connection and import published content before composing a practice set." action={<ButtonLink href="/questions" variant="secondary">Open question bank</ButtonLink>} /> : (
                <div className="space-y-14">
                  <section aria-labelledby="focus-heading">
                    <div className="flex items-baseline justify-between gap-4 border-b border-slate-300 pb-4"><div><p className="font-mono text-xs font-bold text-emerald-700">01 / FOCUS</p><h2 id="focus-heading" className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">Choose your science.</h2></div><p className="hidden text-sm text-slate-500 sm:block">The rest of the session follows this choice.</p></div>
                    <fieldset className="mt-0"><legend className="sr-only">Subject</legend><div className="grid border-b border-slate-300 sm:grid-cols-3">{taxonomy.map((item, index) => { const itemTone = getSubjectTheme(item.slug); const selected = item.id === subjectId; return <label key={item.id} className={cn("group relative min-h-28 cursor-pointer overflow-hidden border-b border-slate-300 px-4 py-5 transition-[background-color,border-color,transform] duration-200 focus-within:outline-2 focus-within:outline-offset-[-2px] focus-within:outline-emerald-600 active:scale-[0.99] sm:min-h-48 sm:border-b-0 sm:border-r sm:px-5 sm:py-6 sm:last:border-r-0", selected ? itemTone.soft : "bg-white/45 hover:border-slate-400 hover:bg-white/90")}><input className="sr-only" type="radio" name="practice-subject" value={item.id} checked={selected} onChange={() => changeSubject(item.id)} /><SubjectMotif slug={item.slug} className={cn("absolute -bottom-10 -right-14 w-56 opacity-[0.06] transition-[opacity,transform] duration-300 group-hover:translate-x-1 group-hover:opacity-[0.12]", itemTone.accent, selected && "opacity-[0.14]")} /><span className="relative flex h-full flex-row items-center justify-between gap-5 sm:flex-col sm:items-start"><span><span className="font-mono text-xs text-slate-400">0{index + 1}</span><SubjectIcon slug={item.slug} className={cn("mt-3 size-7 transition-transform duration-200 group-hover:scale-110", itemTone.accent)} /></span><span><strong className={cn("block text-xl font-black sm:text-2xl", selected ? itemTone.accent : "text-slate-950")}>{item.name}</strong><span className="mt-1 block text-xs font-semibold text-slate-500">{selected ? "Selected subject" : `${item.chapters.length} chapters · choose`}</span></span></span><span className={cn("absolute inset-x-0 bottom-0 h-1 origin-left transition-transform duration-200", itemTone.glow, selected ? "scale-x-100" : "scale-x-25 group-hover:scale-x-75")} /></label>; })}</div></fieldset>
                  </section>

                  <section key={subjectId} className="subject-reveal" aria-labelledby="scope-heading">
                    <div className="grid gap-4 border-b border-slate-300 pb-4 sm:grid-cols-[1fr_auto] sm:items-end"><div><p className="font-mono text-xs font-bold text-emerald-700">02 / SCOPE</p><h2 id="scope-heading" className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">Move from syllabus to signal.</h2></div><p className={cn("text-sm font-bold", tone.accent)}>{subject?.name}</p></div>

                    <fieldset className="mt-5"><legend className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Chapter</legend><div className="mt-3 max-h-72 divide-y divide-slate-200 overflow-y-auto border-y border-slate-300"><label className={cn("flex min-h-14 cursor-pointer items-center justify-between gap-4 border-l-4 px-3 py-3 transition-[background-color,border-color,padding] hover:pl-4", !chapterId ? cn(tone.soft, tone.accent, tone.border) : "border-transparent bg-white/40 hover:bg-white")}><input className="sr-only" type="radio" name="practice-chapter" value="" checked={!chapterId} onChange={() => changeChapter("")} /><span className="font-bold">All available chapters</span><span className="inline-flex items-center gap-2 font-mono text-xs"><span>ALL</span><span aria-hidden="true">{!chapterId ? "✓" : "→"}</span></span></label>{subject?.chapters.map((item, index) => { const selected = chapterId === item.id; return <label key={item.id} className={cn("flex min-h-14 cursor-pointer items-center justify-between gap-4 border-l-4 px-3 py-3 transition-[background-color,border-color,padding] hover:pl-4", selected ? cn(tone.soft, tone.accent, tone.border) : "border-transparent bg-white/40 hover:bg-white")}><input className="sr-only" type="radio" name="practice-chapter" value={item.id} checked={selected} onChange={() => changeChapter(item.id)} /><span><span className="block font-bold">{item.name}</span><span className="mt-1 block text-[10px] font-semibold text-slate-500">{item.topics.length} topic{item.topics.length === 1 ? "" : "s"}</span></span><span className="inline-flex items-center gap-2 font-mono text-xs text-slate-500"><span>{String(index + 1).padStart(2, "0")}</span><span className="grid size-7 place-items-center border border-slate-300 bg-white text-base font-bold" aria-hidden="true">{selected ? "−" : "+"}</span></span></label>; })}</div></fieldset>

                    {chapterId && chapter?.topics.length ? <fieldset key={chapterId} className="subject-reveal mt-7"><legend className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Topic</legend><div className="mt-3 flex flex-wrap border-y border-slate-300">{[{ id: "", name: "All topics" }, ...chapter.topics].map((item) => { const selected = topicId === item.id; return <label key={item.id || "all"} className={cn("flex min-h-11 cursor-pointer items-center gap-2 border-r border-slate-300 px-4 py-3 text-sm font-bold transition-colors last:border-r-0", selected ? cn(tone.soft, tone.accent) : "bg-white/40 hover:bg-white")}><input className="sr-only" type="radio" name="practice-topic" value={item.id} checked={selected} onChange={() => setTopicId(item.id)} />{item.name}<span aria-hidden="true">{selected ? "✓" : "+"}</span></label>; })}</div></fieldset> : <p className="mt-5 text-sm text-slate-500">Choose a chapter to narrow by topic, or keep the full subject scope.</p>}
                  </section>

                  <section aria-labelledby="shape-heading">
                    <div className="border-b border-slate-300 pb-4"><p className="font-mono text-xs font-bold text-emerald-700">03 / SHAPE</p><h2 id="shape-heading" className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">Set the intensity.</h2></div>
                    <div className="mt-6 grid gap-8 xl:grid-cols-2">
                      <fieldset><legend className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Difficulty</legend><div className="mt-3 divide-y divide-slate-200 border-y border-slate-300">{difficultyOptions.map((item) => { const selected = difficulty === item.value; return <label key={item.label} className={cn("flex min-h-12 cursor-pointer items-center justify-between gap-4 px-3 py-3 transition-[background-color,color,transform] active:scale-[0.995]", selected ? cn(tone.soft, tone.accent) : "bg-white/40 text-slate-700 hover:bg-white")}><input className="sr-only" type="radio" name="practice-difficulty" value={item.value} checked={selected} onChange={() => setDifficulty(item.value)} /><strong>{item.label}</strong><span className="ml-auto text-xs font-normal text-slate-500">{item.note}</span><span className={cn("grid size-5 place-items-center border text-[10px]", selected ? cn(tone.border, tone.accent) : "border-slate-300 text-slate-400")} aria-hidden="true">{selected ? "✓" : ""}</span></label>; })}</div></fieldset>
                      <fieldset><legend className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Questions</legend><div className="mt-3 grid grid-cols-4 border-y border-slate-300">{questionCounts.map((item) => { const selected = count === item.value; return <label key={item.value} className={cn("relative min-h-14 cursor-pointer border-r border-slate-300 py-3 text-center transition-[background-color,transform] last:border-r-0 active:scale-[0.98]", selected ? tone.soft : "bg-white/45 hover:bg-white")}><input className="sr-only" type="radio" name="practice-count" value={item.value} checked={selected} onChange={() => setCount(item.value)} /><strong className={cn("block font-mono text-xl", selected ? tone.accent : "text-slate-950")}>{item.label}</strong><span className="mt-1 hidden text-[10px] text-slate-500 sm:block">{selected ? "selected" : item.note}</span><span className={cn("absolute inset-x-0 bottom-0 h-1 transition-transform", tone.glow, selected ? "scale-x-100" : "scale-x-0")} /></label>; })}</div></fieldset>
                    </div>
                  </section>

                  <section className="grid gap-6 border-y border-slate-400 py-7 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="flex items-center gap-2 text-sm font-bold text-slate-900"><CheckIcon className={cn("size-4", tone.accent)} />Immediate feedback · progress saved</p><p className="mt-2 text-sm text-slate-500">{subject?.name}{chapter ? ` / ${chapter.name}` : " / all chapters"} · {difficulty || "mixed difficulty"} · {count === "all" ? "all questions" : `${count} questions`}</p></div><Button type="button" size="lg" className="group min-w-64 justify-between rounded-none" disabled={isPending} onClick={startPractice}>{isPending ? "Creating practice…" : "Begin this session"}<ArrowRightIcon className="size-5 transition-transform group-hover:translate-x-1" /></Button></section>
                </div>
              )}
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
