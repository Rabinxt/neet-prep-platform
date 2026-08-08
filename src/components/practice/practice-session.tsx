"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { ArrowRightIcon, CheckIcon } from "@/components/ui/icons";
import {
  checkPracticeAnswer,
  finishAttempt,
  savePracticeSelection,
  setAttemptCurrentQuestion,
} from "@/server/attempts/actions";
import type { ActiveAttemptData } from "@/server/attempts/types";
import { cn } from "@/lib/utils";

type PracticeResponse = {
  selectedOptionId: string | null;
  checkedResult?: {
    isCorrect: boolean;
    correctOptionId: string;
    explanation: string | null;
  };
};

export function PracticeSession({ attempt }: { attempt: ActiveAttemptData }) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(attempt.currentQuestionIndex);
  const [responses, setResponses] = useState<Record<string, PracticeResponse>>(() => (
    Object.fromEntries(attempt.questions.map((question) => [question.id, {
      selectedOptionId: question.selectedOptionId,
      checkedResult: question.checkedResult,
    }]))
  ));
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const checkedCount = useMemo(
    () => Object.values(responses).filter((response) => response.checkedResult).length,
    [responses],
  );
  const question = attempt.questions[currentIndex];
  const response = responses[question.id];
  const checkedResult = response?.checkedResult;

  function saveSelection(optionId: string | null) {
    if (checkedResult || isPending) return;
    setMessage(undefined);
    setResponses((current) => ({
      ...current,
      [question.id]: { ...current[question.id], selectedOptionId: optionId },
    }));
    startTransition(async () => {
      const result = await savePracticeSelection({
        attemptId: attempt.id,
        questionId: question.id,
        optionId,
        currentIndex,
      });
      if (result.status === "invalid") {
        setMessage(result.message);
        router.refresh();
      }
    });
  }

  function checkAnswer() {
    if (!response?.selectedOptionId || checkedResult || isPending) return;
    setMessage(undefined);
    startTransition(async () => {
      const result = await checkPracticeAnswer({ attemptId: attempt.id, questionId: question.id });
      if (result.status === "invalid") {
        setMessage(result.message);
        return;
      }
      setResponses((current) => ({
        ...current,
        [question.id]: { ...current[question.id], checkedResult: result },
      }));
    });
  }

  function moveTo(index: number) {
    const next = attempt.questions[index];
    if (!next || isPending) return;
    setCurrentIndex(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
    startTransition(async () => {
      const result = await setAttemptCurrentQuestion({
        attemptId: attempt.id,
        type: "PRACTICE",
        currentIndex: index,
      });
      if (result.status === "invalid") setMessage(result.message);
    });
  }

  function finish() {
    if (isPending) return;
    setMessage(undefined);
    startTransition(async () => {
      const result = await finishAttempt({ attemptId: attempt.id, type: "PRACTICE" });
      if (result.status === "invalid") {
        setMessage(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <Container className="flex min-h-16 items-center justify-between gap-4 py-2">
          <div className="flex min-w-0 items-center gap-4">
            <BrandMark className="hidden sm:inline-flex" />
            <div className="hidden h-7 w-px bg-slate-200 sm:block" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-green-700">Saved practice</p>
              <p className="truncate text-sm font-bold text-slate-900">{attempt.name}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => router.push("/practice")}>Exit</Button>
            <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={finish}>Finish</Button>
          </div>
        </Container>
      </header>

      <main><Container className="py-6 sm:py-8">
        {message && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">{message}</div>}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-bold text-slate-800">Question {currentIndex + 1} of {attempt.questions.length}</span>
                <span className="font-medium text-slate-500">{question.difficulty.toLowerCase()} · +{question.positiveMarks}/-{question.negativeMarks}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-green-600" style={{ width: `${((currentIndex + 1) / attempt.questions.length) * 100}%` }} /></div>
            </div>

            <div className="p-5 sm:p-7">
              <p className="text-sm text-slate-500">{question.subject.name} · {question.chapter.name}{question.topic ? ` · ${question.topic.name}` : ""}</p>
              <h1 className="mt-5 text-lg font-bold leading-8 text-slate-950 sm:text-xl">{question.questionText}</h1>
              <fieldset className="mt-7 space-y-3" disabled={Boolean(checkedResult) || isPending}>
                <legend className="sr-only">Choose one answer</legend>
                {question.options.map((option) => {
                  const selected = response?.selectedOptionId === option.id;
                  const correct = checkedResult?.correctOptionId === option.id;
                  const selectedIncorrect = Boolean(checkedResult && selected && !correct);
                  return (
                    <label key={option.id} className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-green-600",
                      !checkedResult && selected && "border-green-600 bg-green-50",
                      !checkedResult && !selected && "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                      correct && "border-green-600 bg-green-50",
                      selectedIncorrect && "border-red-500 bg-red-50",
                      (checkedResult || isPending) && "cursor-default",
                    )}>
                      <input type="radio" name={`practice-${question.id}`} checked={selected} onChange={() => saveSelection(option.id)} className="sr-only" />
                      <span className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-lg border text-sm font-bold",
                        selected ? "border-green-600 bg-green-700 text-white" : "border-slate-300 bg-white text-slate-600",
                        correct && "border-green-600 bg-green-700 text-white",
                        selectedIncorrect && "border-red-500 bg-red-600 text-white",
                      )}>{correct ? <CheckIcon className="size-4" /> : option.optionLabel}</span>
                      <span className="pt-0.5 text-sm leading-6 text-slate-800 sm:text-base">{option.optionText}</span>
                    </label>
                  );
                })}
              </fieldset>

              <div className="mt-6" aria-live="polite">
                {checkedResult && <div className={cn("rounded-xl border p-4", checkedResult.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50")}><p className={cn("font-bold", checkedResult.isCorrect ? "text-green-900" : "text-red-900")}>{checkedResult.isCorrect ? "Correct answer" : "Incorrect answer"}</p>{checkedResult.explanation && <><p className="mt-3 border-t border-current/10 pt-3 text-xs font-bold uppercase tracking-wider text-slate-600">Explanation</p><p className="mt-1 text-sm leading-6 text-slate-700">{checkedResult.explanation}</p></>}</div>}
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" disabled={currentIndex === 0 || isPending} onClick={() => moveTo(currentIndex - 1)}><ArrowRightIcon className="size-4 rotate-180" /> Previous</Button>
                  <Button type="button" variant="ghost" disabled={!response?.selectedOptionId || Boolean(checkedResult) || isPending} onClick={() => saveSelection(null)}>Clear response</Button>
                </div>
                <div className="flex gap-2">
                  {!checkedResult && <Button type="button" disabled={!response?.selectedOptionId || isPending} onClick={checkAnswer}>{isPending ? "Saving..." : "Check answer"}</Button>}
                  {currentIndex < attempt.questions.length - 1
                    ? <Button type="button" variant={checkedResult ? "primary" : "secondary"} disabled={isPending} onClick={() => moveTo(currentIndex + 1)}>Next <ArrowRightIcon className="size-4" /></Button>
                    : <Button type="button" variant={checkedResult ? "primary" : "secondary"} disabled={isPending} onClick={finish}>Finish practice</Button>}
                </div>
              </div>
            </div>
          </Card>

          <aside><Card className="p-5 lg:sticky lg:top-24">
            <div className="flex items-center justify-between"><h2 className="font-bold text-slate-950">Navigator</h2><span className="text-xs text-slate-500">{checkedCount} checked</span></div>
            <div className="mt-5 grid grid-cols-5 gap-2 lg:grid-cols-4">
              {attempt.questions.map((item, index) => {
                const saved = responses[item.id];
                return <button key={item.id} type="button" disabled={isPending} onClick={() => moveTo(index)} aria-label={`Go to question ${index + 1}`} aria-current={index === currentIndex ? "step" : undefined} className={cn(
                  "grid aspect-square place-items-center rounded-lg border text-sm font-bold focus-visible:outline-2",
                  index === currentIndex && "border-slate-900 bg-slate-900 text-white",
                  index !== currentIndex && saved?.checkedResult?.isCorrect && "border-green-200 bg-green-50 text-green-800",
                  index !== currentIndex && saved?.checkedResult && !saved.checkedResult.isCorrect && "border-red-200 bg-red-50 text-red-800",
                  index !== currentIndex && !saved?.checkedResult && saved?.selectedOptionId && "border-blue-200 bg-blue-50 text-blue-800",
                  index !== currentIndex && !saved?.selectedOptionId && "border-slate-200 bg-white text-slate-600",
                )}>{index + 1}</button>;
              })}
            </div>
            <p className="mt-5 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">Selections and checked explanations are saved automatically and restored after refresh.</p>
          </Card></aside>
        </div>
      </Container></main>
    </div>
  );
}
