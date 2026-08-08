"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowRightIcon, BookIcon, CheckIcon } from "@/components/ui/icons";
import { checkQuestionAnswer, type AnswerCheckResult } from "@/server/questions/actions";
import type { PublicQuestion } from "@/server/questions/queries";
import { cn } from "@/lib/utils";
import { SubjectIcon, getSubjectTheme } from "@/components/subjects/subject-visual";

type SavedAnswer = {
  selectedOptionId: string;
  result?: AnswerCheckResult;
};

const difficultyStyles = {
  EASY: "bg-green-50 text-green-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  HARD: "bg-red-50 text-red-700",
};

export function QuestionStudy({ questions }: { questions: PublicQuestion[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, SavedAnswer>>({});
  const [isPending, startTransition] = useTransition();

  if (questions.length === 0) {
    return (
      <EmptyState
        icon={<BookIcon />}
        title="No published questions found"
        description="Try a broader chapter, topic, difficulty, or year filter. Imported content must also be published before it appears here."
      />
    );
  }

  const question = questions[currentIndex];
  const answer = answers[question.id];
  const checkedResult = answer?.result?.status === "checked" ? answer.result : undefined;
  const invalidResult = answer?.result?.status === "invalid" ? answer.result : undefined;
  const tone = getSubjectTheme(question.subject.slug);

  function selectOption(optionId: string) {
    if (checkedResult) return;
    setAnswers((current) => ({
      ...current,
      [question.id]: { selectedOptionId: optionId },
    }));
  }

  function checkAnswer() {
    if (!answer?.selectedOptionId || checkedResult) return;

    startTransition(async () => {
      const result = await checkQuestionAnswer({
        questionId: question.id,
        optionId: answer.selectedOptionId,
      });

      setAnswers((current) => ({
        ...current,
        [question.id]: { selectedOptionId: answer.selectedOptionId, result },
      }));
    });
  }

  function goToQuestion(index: number) {
    setCurrentIndex(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <Card className={cn("overflow-hidden border-t-4", tone.border)}>
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-600">
              Question {currentIndex + 1} of {questions.length}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className={cn("rounded-full px-2.5 py-1", difficultyStyles[question.difficulty])}>
                {question.difficulty.toLowerCase()}
              </span>
              <Badge tone="blue">
                {question.sourceType === "SAMPLE" ? "Development sample" : question.sourceType}
              </Badge>
              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700">
                +{question.positiveMarks} / −{question.negativeMarks}
              </span>
            </div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="progress-shine h-full rounded-full bg-emerald-600 transition-[width]"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
            <span className={cn("mr-1 grid size-8 place-items-center rounded-lg", tone.soft, tone.accent)}><SubjectIcon slug={question.subject.slug} className="size-5" /></span>
            <span className={cn("font-bold", tone.accent)}>{question.subject.name}</span>
            <span aria-hidden="true">·</span>
            <span>{question.chapter.name}</span>
            {question.topic && <><span aria-hidden="true">·</span><span>{question.topic.name}</span></>}
          </div>
          <h2 className="mt-6 text-xl font-bold leading-8 tracking-[-0.015em] text-slate-950 sm:text-2xl">
            {question.questionText}
          </h2>

          <fieldset className="mt-7 space-y-3" disabled={Boolean(checkedResult) || isPending}>
            <legend className="sr-only">Choose one answer</legend>
            {question.options.map((option) => {
              const isSelected = answer?.selectedOptionId === option.id;
              const isCorrectOption = checkedResult?.correctOptionId === option.id;
              const isSelectedIncorrect = Boolean(checkedResult && isSelected && !isCorrectOption);

              return (
                <label
                  key={option.id}
                  className={cn(
                    "group flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all duration-200 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-600",
                    !checkedResult && isSelected && "border-emerald-600 bg-emerald-50 shadow-[inset_3px_0_0_#059669]",
                    !checkedResult && !isSelected && "border-slate-200 hover:translate-x-1 hover:border-slate-300 hover:bg-slate-50",
                    isCorrectOption && "border-emerald-600 bg-emerald-50 shadow-[inset_3px_0_0_#059669]",
                    isSelectedIncorrect && "border-rose-500 bg-rose-50 shadow-[inset_3px_0_0_#e11d48]",
                    (checkedResult || isPending) && "cursor-default",
                  )}
                >
                  <input
                    type="radio"
                    name={`answer-${question.id}`}
                    value={option.id}
                    checked={isSelected}
                    onChange={() => selectOption(option.id)}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-lg border text-sm font-bold",
                      isSelected ? "border-emerald-600 bg-emerald-700 text-white" : "border-slate-300 bg-white text-slate-600 group-hover:border-slate-400",
                      isCorrectOption && "border-emerald-600 bg-emerald-700 text-white",
                      isSelectedIncorrect && "border-rose-500 bg-rose-600 text-white",
                    )}
                  >
                    {isCorrectOption ? <CheckIcon className="size-4" /> : option.optionLabel}
                  </span>
                  <span className="pt-0.5 text-sm leading-6 text-slate-800 sm:text-base">{option.optionText}</span>
                </label>
              );
            })}
          </fieldset>

          <div className="mt-6" aria-live="polite">
            {checkedResult && (
              <div className={cn("relative overflow-hidden rounded-2xl border p-5 pl-6", checkedResult.isCorrect ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50")}>
                <span className={cn("absolute inset-y-0 left-0 w-1", checkedResult.isCorrect ? "bg-emerald-500" : "bg-rose-500")} />
                <p className={cn("font-bold", checkedResult.isCorrect ? "text-green-900" : "text-red-900")}>
                  {checkedResult.isCorrect ? "Correct answer" : "Not quite — review the correct option above"}
                </p>
                {checkedResult.explanation && (
                  <div className="mt-3 border-t border-current/10 pt-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Explanation</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{checkedResult.explanation}</p>
                  </div>
                )}
              </div>
            )}
            {invalidResult && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {invalidResult.message}
              </p>
            )}
          </div>

          <div className="mt-7 flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-6 sm:flex-row">
            <Button type="button" variant="secondary" disabled={currentIndex === 0 || isPending} onClick={() => goToQuestion(currentIndex - 1)}>
              <ArrowRightIcon className="size-4 rotate-180" /> Previous
            </Button>
            <div className="flex gap-3">
              {!checkedResult && (
                <Button type="button" className="flex-1 sm:flex-none" disabled={!answer?.selectedOptionId || isPending} onClick={checkAnswer}>
                  {isPending ? "Checking…" : "Check answer"}
                </Button>
              )}
              <Button type="button" variant={checkedResult ? "primary" : "secondary"} className="flex-1 sm:flex-none" disabled={currentIndex === questions.length - 1 || isPending} onClick={() => goToQuestion(currentIndex + 1)}>
                Next <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <aside>
        <Card className="overflow-hidden p-5 lg:sticky lg:top-24">
          <div className="-mx-5 -mt-5 mb-5 bg-slate-950 px-5 py-4 text-white">
          <h2 className="font-bold text-white">Question navigator</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">Your answers stay on this page while you move between questions.</p>
          </div>
          <div className="mt-5 grid grid-cols-5 gap-2 lg:grid-cols-4">
            {questions.map((item, index) => {
              const saved = answers[item.id];
              const isChecked = saved?.result?.status === "checked";
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goToQuestion(index)}
                  aria-label={`Go to question ${index + 1}`}
                  aria-current={index === currentIndex ? "step" : undefined}
                  className={cn(
                    "grid aspect-square place-items-center rounded-lg border text-sm font-bold transition-colors focus-visible:outline-2",
                    index === currentIndex && "border-green-700 bg-green-700 text-white",
                    index !== currentIndex && isChecked && "border-green-200 bg-green-50 text-green-800",
                    index !== currentIndex && !isChecked && saved && "border-blue-200 bg-blue-50 text-blue-800",
                    index !== currentIndex && !saved && "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                  )}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-xs text-slate-500">
            <p><span className="mr-2 inline-block size-2 rounded-full bg-green-500" />Checked</p>
            <p><span className="mr-2 inline-block size-2 rounded-full bg-blue-400" />Answer selected</p>
            <p><span className="mr-2 inline-block size-2 rounded-full bg-slate-300" />Not answered</p>
          </div>
        </Card>
      </aside>
    </div>
  );
}
