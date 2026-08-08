"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { ArrowRightIcon, CheckIcon, TargetIcon } from "@/components/ui/icons";
import { checkQuestionAnswer, type AnswerCheckResult } from "@/server/questions/actions";
import type { PublicQuestion } from "@/server/questions/queries";
import { cn } from "@/lib/utils";

type PracticeResponse = {
  selectedOptionId?: string;
  result?: AnswerCheckResult;
};

type PracticeSummary = {
  correct: number;
  incorrect: number;
  unanswered: number;
  score: number;
  accuracy: number;
};

function calculateSummary(
  questions: PublicQuestion[],
  responses: Record<string, PracticeResponse>,
): PracticeSummary {
  let correct = 0;
  let incorrect = 0;
  let score = 0;

  for (const question of questions) {
    const result = responses[question.id]?.result;
    if (result?.status !== "checked") continue;

    if (result.isCorrect) {
      correct += 1;
      score += question.positiveMarks;
    } else {
      incorrect += 1;
      score -= question.negativeMarks;
    }
  }

  const attempted = correct + incorrect;
  return {
    correct,
    incorrect,
    unanswered: questions.length - attempted,
    score,
    accuracy: attempted === 0 ? 0 : Math.round((correct / attempted) * 100),
  };
}

export function PracticeSession({
  questions,
  practiceLabel,
}: {
  questions: PublicQuestion[];
  practiceLabel: string;
}) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, PracticeResponse>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const summary = useMemo(
    () => calculateSummary(questions, responses),
    [questions, responses],
  );

  if (questions.length === 0) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4 py-12">
        <Card className="max-w-lg border-dashed p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-950">No questions match this setup</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">Try a broader chapter, topic, or difficulty selection.</p>
          <Button type="button" className="mt-6" onClick={() => router.push("/practice")}>Back to practice setup</Button>
        </Card>
      </div>
    );
  }

  if (isComplete) {
    return (
      <PracticeCompletion
        total={questions.length}
        summary={summary}
        onRestart={() => {
          setResponses({});
          setCurrentIndex(0);
          setIsComplete(false);
        }}
        onSetup={() => router.push("/practice")}
      />
    );
  }

  const question = questions[currentIndex];
  const response = responses[question.id];
  const checkedResult = response?.result?.status === "checked" ? response.result : undefined;
  const invalidResult = response?.result?.status === "invalid" ? response.result : undefined;

  function selectOption(optionId: string) {
    if (checkedResult) return;
    setResponses((current) => ({
      ...current,
      [question.id]: { selectedOptionId: optionId },
    }));
  }

  function clearResponse() {
    if (checkedResult || isPending) return;
    setResponses((current) => {
      const next = { ...current };
      delete next[question.id];
      return next;
    });
  }

  function checkAnswer() {
    if (!response?.selectedOptionId || checkedResult) return;

    startTransition(async () => {
      const result = await checkQuestionAnswer({
        questionId: question.id,
        optionId: response.selectedOptionId!,
      });
      setResponses((current) => ({
        ...current,
        [question.id]: { selectedOptionId: response.selectedOptionId, result },
      }));
    });
  }

  function moveTo(index: number) {
    setCurrentIndex(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <Container className="flex min-h-16 items-center justify-between gap-4 py-2">
          <div className="flex min-w-0 items-center gap-4">
            <BrandMark className="hidden sm:inline-flex" />
            <div className="hidden h-7 w-px bg-slate-200 sm:block" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-green-700">Practice mode</p>
              <p className="truncate text-sm font-bold text-slate-900">{practiceLabel}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => router.push("/practice")}>Exit</Button>
            <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={() => setIsComplete(true)}>Finish</Button>
          </div>
        </Container>
      </header>

      <main>
        <Container className="py-6 sm:py-8">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-slate-800">Question {currentIndex + 1} of {questions.length}</span>
                  <span className="font-medium text-slate-500">{question.difficulty.toLowerCase()} · +{question.positiveMarks}/−{question.negativeMarks}</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-green-600" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
                </div>
              </div>

              <div className="p-5 sm:p-7">
                <p className="text-sm text-slate-500">{question.subject.name} · {question.chapter.name}{question.topic ? ` · ${question.topic.name}` : ""}</p>
                <h1 className="mt-5 text-lg font-bold leading-8 text-slate-950 sm:text-xl">{question.questionText}</h1>

                <fieldset className="mt-7 space-y-3" disabled={Boolean(checkedResult) || isPending}>
                  <legend className="sr-only">Choose one answer</legend>
                  {question.options.map((option) => {
                    const isSelected = response?.selectedOptionId === option.id;
                    const isCorrectOption = checkedResult?.correctOptionId === option.id;
                    const isSelectedIncorrect = Boolean(checkedResult && isSelected && !isCorrectOption);
                    return (
                      <label key={option.id} className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-green-600",
                        !checkedResult && isSelected && "border-green-600 bg-green-50",
                        !checkedResult && !isSelected && "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                        isCorrectOption && "border-green-600 bg-green-50",
                        isSelectedIncorrect && "border-red-500 bg-red-50",
                        (checkedResult || isPending) && "cursor-default",
                      )}>
                        <input type="radio" name={`practice-${question.id}`} value={option.id} checked={isSelected} onChange={() => selectOption(option.id)} className="sr-only" />
                        <span className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-lg border text-sm font-bold",
                          isSelected ? "border-green-600 bg-green-700 text-white" : "border-slate-300 bg-white text-slate-600",
                          isCorrectOption && "border-green-600 bg-green-700 text-white",
                          isSelectedIncorrect && "border-red-500 bg-red-600 text-white",
                        )}>{isCorrectOption ? <CheckIcon className="size-4" /> : option.optionLabel}</span>
                        <span className="pt-0.5 text-sm leading-6 text-slate-800 sm:text-base">{option.optionText}</span>
                      </label>
                    );
                  })}
                </fieldset>

                <div className="mt-6" aria-live="polite">
                  {checkedResult && (
                    <div className={cn("rounded-xl border p-4", checkedResult.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50")}>
                      <p className={cn("font-bold", checkedResult.isCorrect ? "text-green-900" : "text-red-900")}>
                        {checkedResult.isCorrect ? "Correct answer" : "Incorrect answer"}
                      </p>
                      {checkedResult.explanation && <><p className="mt-3 border-t border-current/10 pt-3 text-xs font-bold uppercase tracking-wider text-slate-600">Explanation</p><p className="mt-1 text-sm leading-6 text-slate-700">{checkedResult.explanation}</p></>}
                    </div>
                  )}
                  {invalidResult && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{invalidResult.message}</p>}
                </div>

                <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" disabled={currentIndex === 0 || isPending} onClick={() => moveTo(currentIndex - 1)}><ArrowRightIcon className="size-4 rotate-180" /> Previous</Button>
                    <Button type="button" variant="ghost" disabled={!response?.selectedOptionId || Boolean(checkedResult) || isPending} onClick={clearResponse}>Clear response</Button>
                  </div>
                  <div className="flex gap-2">
                    {!checkedResult && <Button type="button" disabled={!response?.selectedOptionId || isPending} onClick={checkAnswer}>{isPending ? "Checking…" : "Check answer"}</Button>}
                    {currentIndex < questions.length - 1 ? (
                      <Button type="button" variant={checkedResult ? "primary" : "secondary"} disabled={isPending} onClick={() => moveTo(currentIndex + 1)}>Next <ArrowRightIcon className="size-4" /></Button>
                    ) : (
                      <Button type="button" variant={checkedResult ? "primary" : "secondary"} disabled={isPending} onClick={() => setIsComplete(true)}>Finish practice</Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <aside>
              <Card className="p-5 lg:sticky lg:top-24">
                <div className="flex items-center justify-between"><h2 className="font-bold text-slate-950">Navigator</h2><span className="text-xs text-slate-500">{summary.correct + summary.incorrect} checked</span></div>
                <div className="mt-5 grid grid-cols-5 gap-2 lg:grid-cols-4">
                  {questions.map((item, index) => {
                    const saved = responses[item.id];
                    const result = saved?.result?.status === "checked" ? saved.result : undefined;
                    return (
                      <button key={item.id} type="button" onClick={() => moveTo(index)} aria-label={`Go to question ${index + 1}`} aria-current={index === currentIndex ? "step" : undefined} className={cn(
                        "grid aspect-square place-items-center rounded-lg border text-sm font-bold focus-visible:outline-2",
                        index === currentIndex && "border-slate-900 bg-slate-900 text-white",
                        index !== currentIndex && result?.isCorrect && "border-green-200 bg-green-50 text-green-800",
                        index !== currentIndex && result && !result.isCorrect && "border-red-200 bg-red-50 text-red-800",
                        index !== currentIndex && !result && saved?.selectedOptionId && "border-blue-200 bg-blue-50 text-blue-800",
                        index !== currentIndex && !saved?.selectedOptionId && "border-slate-200 bg-white text-slate-600",
                      )}>{index + 1}</button>
                    );
                  })}
                </div>
                <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-xs text-slate-500">
                  <p><span className="mr-2 inline-block size-2 rounded-full bg-green-500" />Correct</p>
                  <p><span className="mr-2 inline-block size-2 rounded-full bg-red-500" />Incorrect</p>
                  <p><span className="mr-2 inline-block size-2 rounded-full bg-blue-400" />Selected, not checked</p>
                  <p><span className="mr-2 inline-block size-2 rounded-full bg-slate-300" />Unanswered</p>
                </div>
              </Card>
            </aside>
          </div>
        </Container>
      </main>
    </div>
  );
}

function PracticeCompletion({
  total,
  summary,
  onRestart,
  onSetup,
}: {
  total: number;
  summary: PracticeSummary;
  onRestart: () => void;
  onSetup: () => void;
}) {
  const metrics = [
    { label: "Correct", value: summary.correct, tone: "text-green-700 bg-green-50" },
    { label: "Incorrect", value: summary.incorrect, tone: "text-red-700 bg-red-50" },
    { label: "Unanswered", value: summary.unanswered, tone: "text-slate-700 bg-slate-100" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white"><Container className="flex h-16 items-center"><BrandMark /></Container></header>
      <main><Container className="py-10 sm:py-16">
        <Card className="mx-auto max-w-3xl overflow-hidden">
          <div className="bg-slate-950 px-6 py-10 text-center text-white sm:px-10">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-green-400/20 text-green-300"><TargetIcon /></span>
            <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-green-300">Practice complete</p>
            <h1 className="mt-2 text-3xl font-bold">You completed the set</h1>
            <p className="mt-2 text-sm text-slate-300">This result is temporary and has not been saved.</p>
          </div>
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-3 gap-3">
              {metrics.map((metric) => <div key={metric.label} className={cn("rounded-xl p-4 text-center", metric.tone)}><p className="text-2xl font-bold">{metric.value}</p><p className="mt-1 text-xs font-semibold">{metric.label}</p></div>)}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Total questions</p><p className="mt-1 text-2xl font-bold text-slate-950">{total}</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Score</p><p className="mt-1 text-2xl font-bold text-slate-950">{summary.score}</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Accuracy</p><p className="mt-1 text-2xl font-bold text-slate-950">{summary.accuracy}%</p></div>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">Accuracy is correct answers divided by checked answers. Unchecked and selected-but-unchecked questions count as unanswered and score zero.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button type="button" onClick={onRestart}>Restart practice</Button>
              <Button type="button" variant="secondary" onClick={onSetup}>Back to practice setup</Button>
            </div>
          </div>
        </Card>
      </Container></main>
    </div>
  );
}
