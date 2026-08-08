"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
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

  if (showReview) {
    return <AnswerReview attempt={attempt} onBack={() => setShowReview(false)} />;
  }

  const metrics = [
    { label: "Attempted", value: attempt.overall.attempted },
    { label: "Correct", value: attempt.overall.correct },
    { label: "Incorrect", value: attempt.overall.incorrect },
    { label: "Unanswered", value: attempt.overall.unanswered },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white"><Container className="flex h-16 items-center"><BrandMark /></Container></header>
      <main><Container className="py-8 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <Card className="overflow-hidden">
            <div className="bg-slate-950 px-6 py-10 text-center text-white sm:px-10">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-green-400/20 text-green-300"><TargetIcon /></span>
              <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-green-300">
                {attempt.status === "EXPIRED" ? "Time expired · test submitted" : isExam ? "Exam submitted" : "Practice complete"}
              </p>
              <h1 className="mt-2 text-3xl font-bold">{attempt.name}</h1>
              <p className="mt-2 text-sm text-slate-300">This result is saved and remains available after refresh.</p>
            </div>
            <div className="p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-green-50 p-5 text-center"><p className="text-sm font-semibold text-green-800">Score</p><p className="mt-2 text-4xl font-bold text-green-900">{attempt.overall.score}<span className="text-lg text-green-700"> / {attempt.overall.maximumMarks}</span></p></div>
                <div className="rounded-2xl bg-blue-50 p-5 text-center"><p className="text-sm font-semibold text-blue-800">Accuracy</p><p className="mt-2 text-4xl font-bold text-blue-900">{attempt.overall.accuracy}%</p></div>
                <div className="rounded-2xl bg-slate-100 p-5 text-center"><p className="text-sm font-semibold text-slate-700">Total questions</p><p className="mt-2 text-4xl font-bold text-slate-950">{attempt.overall.total}</p></div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {metrics.map((metric) => <div key={metric.label} className="rounded-xl border border-slate-200 p-4 text-center"><p className="text-2xl font-bold text-slate-950">{metric.value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{metric.label}</p></div>)}
              </div>

              {isExam && attempt.subjects.length > 1 && (
                <section className="mt-8">
                  <h2 className="text-lg font-bold text-slate-950">Subject-wise performance</h2>
                  <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[620px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Attempted</th><th className="px-4 py-3">Correct</th><th className="px-4 py-3">Incorrect</th><th className="px-4 py-3">Score</th></tr></thead>
                      <tbody className="divide-y divide-slate-200">
                        {attempt.subjects.map((subject) => <tr key={subject.slug}><th className="px-4 py-3 font-bold text-slate-900">{subject.name}</th><td className="px-4 py-3 text-slate-600">{subject.attempted}</td><td className="px-4 py-3 text-green-700">{subject.correct}</td><td className="px-4 py-3 text-red-700">{subject.incorrect}</td><td className="px-4 py-3 font-bold text-slate-900">{subject.score} / {subject.maximumMarks}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <p className="mt-6 text-xs leading-5 text-slate-500">
                Accuracy is correct answers divided by {isExam ? "attempted" : "checked"} answers. Unanswered questions score zero.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button type="button" onClick={() => setShowReview(true)}>Review answers <ArrowRightIcon className="size-4" /></Button>
                <Button type="button" variant="secondary" onClick={() => router.push(isExam ? "/mock-tests" : "/practice")}>{isExam ? "Take another test" : "Start another practice"}</Button>
              </div>
            </div>
          </Card>
        </div>
      </Container></main>
    </div>
  );
}

function AnswerReview({ attempt, onBack }: { attempt: CompletedAttemptData; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <Container className="flex min-h-16 items-center justify-between gap-4 py-2">
          <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-green-700">Saved answer review</p><h1 className="truncate font-bold text-slate-950">{attempt.name}</h1></div>
          <Button type="button" variant="secondary" size="sm" onClick={onBack}>Back to results</Button>
        </Container>
      </header>
      <main><Container className="py-6 sm:py-8">
        <div className="mx-auto max-w-4xl space-y-5">
          {attempt.review.map((item, index) => <ReviewQuestion key={item.questionId} item={item} number={index + 1} />)}
        </div>
      </Container></main>
    </div>
  );
}

function ReviewQuestion({ item, number }: { item: AttemptReviewItem; number: number }) {
  const outcomeTone = item.outcome === "CORRECT"
    ? "bg-green-50 text-green-800"
    : item.outcome === "INCORRECT"
      ? "bg-red-50 text-red-800"
      : "bg-slate-100 text-slate-700";

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
        <div><p className="text-sm font-bold text-slate-900">Question {number}</p><p className="mt-1 text-xs text-slate-500">{item.subject.name} · {item.chapter.name}{item.topic ? ` · ${item.topic.name}` : ""}</p></div>
        <div className="flex items-center gap-2"><span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", outcomeTone)}>{item.outcome.toLowerCase()}</span><span className="text-sm font-bold text-slate-700">{item.marksAwarded > 0 ? "+" : ""}{item.marksAwarded} marks</span></div>
      </div>
      <div className="p-5 sm:p-6">
        <h2 className="font-bold leading-7 text-slate-950">{item.questionText}</h2>
        <div className="mt-5 space-y-2">
          {item.options.map((option) => {
            const isCorrect = option.id === item.correctOptionId;
            const isSelected = option.id === item.selectedOptionId;
            return (
              <div key={option.id} className={cn("flex items-start gap-3 rounded-xl border p-3 text-sm", isCorrect && "border-green-500 bg-green-50", isSelected && !isCorrect && "border-red-500 bg-red-50", !isCorrect && !isSelected && "border-slate-200")}> 
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg border font-bold", isCorrect ? "border-green-600 bg-green-700 text-white" : isSelected ? "border-red-500 bg-red-600 text-white" : "border-slate-300 bg-white text-slate-600")}>{isCorrect ? <CheckIcon className="size-4" /> : option.optionLabel}</span>
                <span className="pt-1 text-slate-800">{option.optionText}</span>
                {isSelected && <span className="ml-auto shrink-0 pt-1 text-xs font-bold text-slate-500">Your answer</span>}
              </div>
            );
          })}
        </div>
        {item.outcome === "UNANSWERED" && <p className="mt-4 text-sm font-semibold text-slate-600">You did not submit an answer for this question.</p>}
        {item.explanation && <div className="mt-5 rounded-xl bg-blue-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-blue-800">Explanation</p><p className="mt-2 text-sm leading-6 text-slate-700">{item.explanation}</p></div>}
      </div>
    </Card>
  );
}
