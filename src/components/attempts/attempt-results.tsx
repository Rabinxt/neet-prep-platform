"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { SubjectIcon, getSubjectTheme } from "@/components/subjects/subject-visual";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { ArrowRightIcon, CheckIcon, TargetIcon } from "@/components/ui/icons";
import type { AttemptReviewItem, CompletedAttemptData } from "@/server/attempts/types";
import { cn } from "@/lib/utils";

export function AttemptResults({ attempt }: { attempt: CompletedAttemptData }) {
  const router = useRouter();
  const [showReview, setShowReview] = useState(false);
  const isExam = attempt.type === "MOCK_EXAM";
  if (showReview) return <AnswerReview attempt={attempt} onBack={() => setShowReview(false)} />;

  const scoreProgress = attempt.overall.maximumMarks > 0
    ? Math.max(0, Math.min(100, (attempt.overall.score / attempt.overall.maximumMarks) * 100))
    : 0;
  const metrics = [
    { label: "Attempted", value: attempt.overall.attempted, tone: "text-blue-700", line: "bg-blue-500" },
    { label: "Correct", value: attempt.overall.correct, tone: "text-emerald-700", line: "bg-emerald-500" },
    { label: "Incorrect", value: attempt.overall.incorrect, tone: "text-rose-700", line: "bg-rose-500" },
    { label: "Unanswered", value: attempt.overall.unanswered, tone: "text-slate-600", line: "bg-slate-400" },
  ];

  return (
    <div className="min-h-screen bg-[#f4f6fa]">
      <header className="border-b border-slate-200/80 bg-white"><Container className="flex h-[4.5rem] items-center"><BrandMark /></Container></header>
      <main>
        <section className="relative overflow-hidden bg-slate-950 py-12 text-white sm:py-16">
          <div className="study-grid absolute inset-0 opacity-60" />
          <div className="absolute left-1/2 top-0 size-96 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
          <Container className="relative">
            <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300"><TargetIcon className="size-4" />{attempt.status === "EXPIRED" ? "Time expired · submitted" : isExam ? "Exam submitted" : "Practice complete"}</div>
                <h1 className="mt-5 text-3xl font-bold tracking-[-0.045em] sm:text-5xl">{attempt.name}</h1>
                <p className="mt-3 text-sm text-slate-400">Saved securely and ready to review whenever you are.</p>
              </div>
              <div className="mx-auto grid place-items-center">
                <div className="grid size-44 place-items-center rounded-full p-2" style={{ background: `conic-gradient(#34d399 ${scoreProgress}%, rgba(255,255,255,.1) 0)` }} aria-label={`Score ${attempt.overall.score} out of ${attempt.overall.maximumMarks}`}>
                  <div className="grid size-full place-items-center rounded-full bg-slate-950 text-center"><div><span className="block text-4xl font-bold">{attempt.overall.score}</span><span className="mt-1 block text-xs font-semibold text-slate-400">of {attempt.overall.maximumMarks} marks</span></div></div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        <Container className="py-8 sm:py-12">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-4 sm:grid-cols-[1.25fr_1fr]">
              <Card className="relative overflow-hidden border-0 bg-emerald-700 p-6 text-white sm:p-8"><div className="dot-field absolute inset-0 opacity-20" /><div className="relative"><p className="text-sm font-semibold text-emerald-100">Accuracy</p><p className="mt-2 text-6xl font-bold tracking-[-0.06em]">{attempt.overall.accuracy}<span className="text-3xl text-emerald-200">%</span></p><div className="mt-6 h-2 overflow-hidden rounded-full bg-black/15"><div className="progress-shine h-full rounded-full bg-white" style={{ width: `${attempt.overall.accuracy}%` }} /></div><p className="mt-3 text-xs text-emerald-100">Based on {isExam ? "attempted" : "checked"} answers</p></div></Card>
              <Card className="border-0 p-6 sm:p-8"><p className="text-sm font-semibold text-slate-500">Questions in this set</p><p className="mt-2 text-6xl font-bold tracking-[-0.06em] text-slate-950">{attempt.overall.total}</p><p className="mt-5 text-sm text-slate-500">{attempt.overall.attempted} answered · {attempt.overall.unanswered} left open</p></Card>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {metrics.map((metric) => <div key={metric.label} className="relative overflow-hidden border-b border-slate-200 bg-white px-5 py-5 shadow-sm"><span className={cn("absolute inset-x-0 top-0 h-1", metric.line)} /><p className={cn("text-3xl font-bold", metric.tone)}>{metric.value}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{metric.label}</p></div>)}
            </div>

            {isExam && attempt.subjects.length > 1 && (
              <section className="mt-10">
                <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Performance map</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Subject by subject</h2></div>
                <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200 bg-white px-5 sm:px-7">
                  {attempt.subjects.map((subject) => {
                    const tone = getSubjectTheme(subject.slug);
                    const percentage = subject.maximumMarks > 0 ? Math.max(0, Math.min(100, (subject.score / subject.maximumMarks) * 100)) : 0;
                    return <div key={subject.slug} className="grid gap-4 py-5 sm:grid-cols-[1fr_1.5fr_auto] sm:items-center"><div className="flex items-center gap-3"><span className={cn("grid size-10 place-items-center rounded-xl", tone.soft, tone.accent)}><SubjectIcon slug={subject.slug} className="size-6" /></span><div><p className="font-bold text-slate-950">{subject.name}</p><p className="text-xs text-slate-500">{subject.correct} correct · {subject.incorrect} incorrect</p></div></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn("h-full rounded-full", tone.glow)} style={{ width: `${percentage}%` }} /></div><p className="font-bold text-slate-950">{subject.score} <span className="text-sm font-medium text-slate-400">/ {subject.maximumMarks}</span></p></div>;
                  })}
                </div>
              </section>
            )}

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center"><Button type="button" size="lg" onClick={() => setShowReview(true)}>Review every answer <ArrowRightIcon className="size-4" /></Button><Button type="button" size="lg" variant="secondary" onClick={() => router.push(isExam ? "/mock-tests" : "/practice")}>{isExam ? "Take another test" : "Start another practice"}</Button></div>
          </div>
        </Container>
      </main>
    </div>
  );
}

function AnswerReview({ attempt, onBack }: { attempt: CompletedAttemptData; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#eef1f6]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950 text-white shadow-lg"><Container className="flex min-h-[4.5rem] items-center justify-between gap-4 py-2"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Answer review</p><h1 className="truncate font-bold text-white">{attempt.name}</h1></div><Button type="button" variant="secondary" size="sm" onClick={onBack}>Back to results</Button></Container></header>
      <main><Container className="py-6 sm:py-10"><div className="mx-auto max-w-4xl space-y-5">{attempt.review.map((item, index) => <ReviewQuestion key={item.questionId} item={item} number={index + 1} />)}</div></Container></main>
    </div>
  );
}

function ReviewQuestion({ item, number }: { item: AttemptReviewItem; number: number }) {
  const tone = getSubjectTheme(item.subject.slug);
  const outcomeTone = item.outcome === "CORRECT" ? "bg-emerald-50 text-emerald-800" : item.outcome === "INCORRECT" ? "bg-rose-50 text-rose-800" : "bg-slate-100 text-slate-700";
  return (
    <Card className={cn("overflow-hidden border-t-4", tone.border)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><span className={cn("grid size-9 place-items-center rounded-xl", tone.soft, tone.accent)}><SubjectIcon slug={item.subject.slug} className="size-5" /></span><div><p className="text-sm font-bold text-slate-900">Question {number}</p><p className="mt-1 text-xs text-slate-500">{item.subject.name} · {item.chapter.name}{item.topic ? ` · ${item.topic.name}` : ""}</p></div></div><div className="flex items-center gap-2"><span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", outcomeTone)}>{item.outcome.toLowerCase()}</span><span className="text-sm font-bold text-slate-700">{item.marksAwarded > 0 ? "+" : ""}{item.marksAwarded} marks</span></div></div>
      <div className="p-5 sm:p-7"><h2 className="text-lg font-bold leading-8 text-slate-950">{item.questionText}</h2><div className="mt-5 space-y-2">{item.options.map((option) => { const isCorrect = option.id === item.correctOptionId; const isSelected = option.id === item.selectedOptionId; return <div key={option.id} className={cn("flex items-start gap-3 rounded-xl border p-3 text-sm", isCorrect && "border-emerald-500 bg-emerald-50 shadow-[inset_3px_0_0_#10b981]", isSelected && !isCorrect && "border-rose-500 bg-rose-50 shadow-[inset_3px_0_0_#f43f5e]", !isCorrect && !isSelected && "border-slate-200")}><span className={cn("grid size-7 shrink-0 place-items-center rounded-lg border font-bold", isCorrect ? "border-emerald-600 bg-emerald-700 text-white" : isSelected ? "border-rose-500 bg-rose-600 text-white" : "border-slate-300 bg-white text-slate-600")}>{isCorrect ? <CheckIcon className="size-4" /> : option.optionLabel}</span><span className="pt-1 text-slate-800">{option.optionText}</span>{isSelected && <span className="ml-auto shrink-0 pt-1 text-xs font-bold text-slate-500">Your answer</span>}</div>; })}</div>{item.outcome === "UNANSWERED" && <p className="mt-4 text-sm font-semibold text-slate-600">You did not submit an answer for this question.</p>}{item.explanation && <div className="mt-5 border-l-4 border-blue-400 bg-blue-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-blue-800">Explanation</p><p className="mt-2 text-sm leading-6 text-slate-700">{item.explanation}</p></div>}</div>
    </Card>
  );
}
