"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { SubjectIcon, getSubjectTheme } from "@/components/subjects/subject-visual";
import { SubjectMotif } from "@/components/subjects/subject-motif";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ArrowRightIcon, CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { AttemptReviewItem, CompletedAttemptData } from "@/server/attempts/types";

export function AttemptResults({ attempt }: { attempt: CompletedAttemptData }) {
  const router = useRouter();
  const [showReview, setShowReview] = useState(false);
  const isExam = attempt.type === "MOCK_EXAM";
  if (showReview) return <AnswerReview attempt={attempt} onBack={() => setShowReview(false)} />;

  const leadSubject = attempt.subjects[0];
  const leadSlug = leadSubject?.slug ?? "biology";
  const tone = getSubjectTheme(leadSlug);
  const scoreProgress = attempt.overall.maximumMarks > 0 ? Math.max(0, Math.min(1, attempt.overall.score / attempt.overall.maximumMarks)) : 0;

  return (
    <div className="min-h-screen bg-[#eef3f1]">
      <header className="border-b border-slate-300"><Container className="flex h-[4.5rem] items-center"><BrandMark /></Container></header>
      <main>
        <section className="relative isolate overflow-hidden border-b border-slate-300">
          <SubjectMotif slug={leadSlug} className={cn("absolute -right-40 top-2 w-[55rem] opacity-[0.09]", tone.accent)} />
          <Container className="sequence-enter relative py-10 sm:py-14 lg:py-20">
            <div className="flex flex-wrap items-center gap-4"><p className={cn("flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em]", tone.accent)}><span className={cn("h-px w-10", tone.glow)} />{attempt.status === "EXPIRED" ? "Time resolved · submitted" : isExam ? "Exam complete" : "Practice complete"}</p><span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Saved result</span></div>
            <h1 className="mt-6 max-w-4xl text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">{attempt.name}</h1>

            <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Final score</p>
                <p className="result-number mt-2 whitespace-nowrap font-mono text-[clamp(6rem,17vw,13rem)] font-bold leading-[0.78] tracking-[-0.1em] text-slate-950">{attempt.overall.score}<span className="ml-3 text-[0.23em] tracking-[-0.04em] text-slate-400">/{attempt.overall.maximumMarks}</span></p>
                <div className="mt-8 h-px max-w-4xl bg-slate-300"><div className={cn("progress-fill h-px", tone.glow)} style={{ transform: `scaleX(${scoreProgress})` }} /></div>
              </div>
              <div className="border-t border-slate-300 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-2">
                <p className="font-mono text-[clamp(4rem,8vw,7rem)] font-bold leading-none tracking-[-0.08em] text-slate-950">{attempt.overall.accuracy}<span className={cn("text-[0.38em]", tone.accent)}>%</span></p>
                <p className="mt-3 text-sm font-bold text-slate-800">accuracy from {isExam ? "attempted" : "checked"} answers</p>
                <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">Review the pattern, not just the number. Every incorrect answer is a precise place to return.</p>
              </div>
            </div>

            <dl className="stagger-in mt-12 grid grid-cols-2 border-y border-slate-300 sm:grid-cols-4">
              <ResultMeasure label="Correct" value={attempt.overall.correct} className="text-emerald-700" />
              <ResultMeasure label="Incorrect" value={attempt.overall.incorrect} className="text-rose-700" />
              <ResultMeasure label="Unanswered" value={attempt.overall.unanswered} className="text-slate-600" />
              <ResultMeasure label="Attempted" value={attempt.overall.attempted} className={tone.accent} />
            </dl>
          </Container>
        </section>

        <Container className="py-14 sm:py-20">
          <div className="mx-auto max-w-6xl space-y-20">
            {attempt.subjects.length > 0 ? <SubjectBands attempt={attempt} /> : null}

            <section className="grid gap-8 border-y border-slate-400 py-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">Turn the result into revision</p><h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl">The useful part starts with the answers.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">Compare your reasoning with the correct response and explanation, one question at a time.</p></div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col"><Button type="button" size="lg" className="group min-w-64 justify-between rounded-none" onClick={() => setShowReview(true)}>Review every answer <ArrowRightIcon className="size-5 transition-transform group-hover:translate-x-1" /></Button><Button type="button" size="lg" variant="secondary" className="rounded-none" onClick={() => router.push(isExam ? "/mock-tests" : "/practice")}>{isExam ? "Take another test" : "Compose another session"}</Button></div>
            </section>
          </div>
        </Container>
      </main>
    </div>
  );
}

function ResultMeasure({ label, value, className }: { label: string; value: number; className: string }) {
  return <div className="border-b border-r border-slate-200 px-4 py-5 last:border-r-0 sm:border-b-0 sm:px-6"><dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</dt><dd className={cn("mt-3 font-mono text-4xl font-bold tracking-[-0.05em]", className)}>{value}</dd></div>;
}

function SubjectBands({ attempt }: { attempt: CompletedAttemptData }) {
  return <section aria-labelledby="subject-results-heading"><div className="grid gap-5 lg:grid-cols-[0.55fr_1fr] lg:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Performance field</p><h2 id="subject-results-heading" className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl">Subject by subject.</h2></div><p className="max-w-lg text-sm leading-6 text-slate-500 lg:justify-self-end">Marks and answer states come directly from the submitted attempt.</p></div><div className="stagger-in mt-8 border-y border-slate-300">{attempt.subjects.map((subject, index) => { const subjectTone = getSubjectTheme(subject.slug); const percentage = subject.maximumMarks > 0 ? Math.max(0, Math.min(1, subject.score / subject.maximumMarks)) : 0; return <div key={subject.slug} className={cn("relative grid min-h-28 overflow-hidden border-b border-slate-300 px-4 py-6 last:border-b-0 sm:grid-cols-[3rem_minmax(11rem,0.55fr)_minmax(12rem,1fr)_7rem] sm:items-center sm:px-6", subjectTone.soft)}><SubjectMotif slug={subject.slug} className={cn("absolute -right-16 top-1/2 w-72 -translate-y-1/2 opacity-[0.08]", subjectTone.accent)} /><span className="relative font-mono text-xs text-slate-400">0{index + 1}</span><div className="relative flex items-center gap-3"><SubjectIcon slug={subject.slug} className={cn("size-7", subjectTone.accent)} /><div><p className="text-xl font-black text-slate-950">{subject.name}</p><p className="mt-1 text-xs text-slate-500">{subject.correct} correct · {subject.incorrect} incorrect · {subject.unanswered} open</p></div></div><div className="relative mt-5 h-px bg-white sm:mt-0"><div className={cn("progress-fill h-px", subjectTone.glow)} style={{ transform: `scaleX(${percentage})` }} /></div><p className="relative mt-3 text-right font-mono text-xl font-bold text-slate-950 sm:mt-0">{subject.score}<span className="text-xs text-slate-400">/{subject.maximumMarks}</span></p></div>; })}</div></section>;
}

function AnswerReview({ attempt, onBack }: { attempt: CompletedAttemptData; onBack: () => void }) {
  return <div className="min-h-screen bg-[#eef3f1]"><header className="sticky top-0 z-40 border-b border-slate-300 bg-[#eef3f1]/95 backdrop-blur"><Container className="flex min-h-[4.5rem] items-center justify-between gap-4 py-2"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Answer review</p><h1 className="truncate font-black text-slate-950">{attempt.name}</h1></div><Button type="button" variant="secondary" size="sm" className="rounded-none" onClick={onBack}>Back to result</Button></Container></header><main><Container className="py-8 sm:py-12"><div className="mx-auto max-w-5xl"><div className="mb-10 grid gap-5 border-b border-slate-300 pb-7 sm:grid-cols-[1fr_auto] sm:items-end"><div><p className="font-mono text-xs text-emerald-700">{String(attempt.review.length).padStart(2, "0")} QUESTIONS</p><h2 className="mt-2 text-4xl font-black tracking-[-0.05em] text-slate-950">Read the reasoning trail.</h2></div><p className="max-w-sm text-sm leading-6 text-slate-500">Your answer, the correct answer, and the explanation stay spatially connected.</p></div><div className="space-y-12">{attempt.review.map((item, index) => <ReviewQuestion key={item.questionId} item={item} number={index + 1} />)}</div></div></Container></main></div>;
}

function ReviewQuestion({ item, number }: { item: AttemptReviewItem; number: number }) {
  const tone = getSubjectTheme(item.subject.slug);
  const outcomeTone = item.outcome === "CORRECT" ? "text-emerald-700" : item.outcome === "INCORRECT" ? "text-rose-700" : "text-slate-600";
  return <article className="grid gap-5 border-t border-slate-400 pt-6 sm:grid-cols-[5rem_minmax(0,1fr)]"><div><p className="font-mono text-3xl font-bold tracking-[-0.05em] text-slate-400">{String(number).padStart(2, "0")}</p><p className={cn("mt-2 text-[10px] font-bold uppercase tracking-[0.16em]", outcomeTone)}>{item.outcome.toLowerCase()}</p><p className="mt-1 font-mono text-xs text-slate-500">{item.marksAwarded > 0 ? "+" : ""}{item.marksAwarded} marks</p></div><div><div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]"><SubjectIcon slug={item.subject.slug} className={cn("size-5", tone.accent)} /><span className={tone.accent}>{item.subject.name}</span><span className="text-slate-300">/</span><span className="text-slate-500">{item.chapter.name}</span>{item.topic ? <><span className="text-slate-300">/</span><span className="text-slate-500">{item.topic.name}</span></> : null}</div><h2 className="mt-5 text-xl font-black leading-8 tracking-[-0.02em] text-slate-950 sm:text-2xl">{item.questionText}</h2><div className="mt-6 divide-y divide-slate-200 border-y border-slate-300">{item.options.map((option) => { const isCorrect = option.id === item.correctOptionId; const isSelected = option.id === item.selectedOptionId; return <div key={option.id} className={cn("grid min-h-14 grid-cols-[2.5rem_1fr_auto] items-center gap-3 py-3", isCorrect && "border-l-2 border-emerald-500 bg-emerald-50/70 pl-3", isSelected && !isCorrect && "border-l-2 border-rose-500 bg-rose-50/60 pl-3")}><span className={cn("font-mono font-bold", isCorrect ? "text-emerald-700" : isSelected ? "text-rose-700" : "text-slate-400")}>{isCorrect ? <CheckIcon className="size-4" /> : option.optionLabel}</span><span className={cn("text-sm text-slate-800", (isCorrect || isSelected) && "font-bold")}>{option.optionText}</span>{isSelected ? <span className="pr-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Your answer</span> : null}</div>; })}</div>{item.outcome === "UNANSWERED" ? <p className="mt-4 text-sm font-semibold text-slate-600">You did not submit an answer for this question.</p> : null}{item.explanation ? <section className="mt-6 grid gap-3 border-y border-blue-300 py-5 sm:grid-cols-[8rem_1fr]"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-800">Explanation</p><p className="text-sm leading-7 text-slate-700">{item.explanation}</p></section> : null}</div></article>;
}
