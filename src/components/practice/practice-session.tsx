"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { SubjectIcon, getSubjectTheme } from "@/components/subjects/subject-visual";
import { SubjectMotif } from "@/components/subjects/subject-motif";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ArrowRightIcon, CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { checkPracticeAnswer, finishAttempt, savePracticeSelection, setAttemptCurrentQuestion } from "@/server/attempts/actions";
import type { ActiveAttemptData } from "@/server/attempts/types";

type PracticeResponse = {
  selectedOptionId: string | null;
  checkedResult?: { isCorrect: boolean; correctOptionId: string; explanation: string | null };
};

export function PracticeSession({ attempt }: { attempt: ActiveAttemptData }) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(attempt.currentQuestionIndex);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [responses, setResponses] = useState<Record<string, PracticeResponse>>(() => Object.fromEntries(attempt.questions.map((question) => [question.id, { selectedOptionId: question.selectedOptionId, checkedResult: question.checkedResult }])));
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const checkedCount = useMemo(() => Object.values(responses).filter((response) => response.checkedResult).length, [responses]);
  const question = attempt.questions[currentIndex];
  const response = responses[question.id];
  const checkedResult = response?.checkedResult;
  const tone = getSubjectTheme(question.subject.slug);
  const progress = (currentIndex + 1) / attempt.questions.length;

  function saveSelection(optionId: string | null) {
    if (checkedResult || isPending) return;
    setMessage(undefined);
    setResponses((current) => ({ ...current, [question.id]: { ...current[question.id], selectedOptionId: optionId } }));
    startTransition(async () => {
      const result = await savePracticeSelection({ attemptId: attempt.id, questionId: question.id, optionId, currentIndex });
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
      setResponses((current) => ({ ...current, [question.id]: { ...current[question.id], checkedResult: result } }));
    });
  }

  function moveTo(index: number) {
    const next = attempt.questions[index];
    if (!next || isPending || index === currentIndex) return;
    setDirection(index > currentIndex ? "forward" : "backward");
    setCurrentIndex(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
    startTransition(async () => {
      const result = await setAttemptCurrentQuestion({ attemptId: attempt.id, type: "PRACTICE", currentIndex: index });
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

  const compactAction = "h-11 rounded-none px-3 text-xs sm:px-5 sm:text-sm";
  const actionControls = <div className="mx-auto flex max-w-5xl flex-nowrap items-center justify-between gap-2"><div className="flex gap-1 sm:gap-2"><Button type="button" variant="secondary" className={compactAction} disabled={currentIndex === 0 || isPending} onClick={() => moveTo(currentIndex - 1)}><ArrowRightIcon className="size-4 rotate-180" /> Previous</Button><Button type="button" variant="ghost" className={compactAction} disabled={!response?.selectedOptionId || Boolean(checkedResult) || isPending} onClick={() => saveSelection(null)}>Clear</Button></div><div className="flex gap-1 sm:gap-2">{!checkedResult ? <Button type="button" className={compactAction} disabled={!response?.selectedOptionId || isPending} onClick={checkAnswer}>{isPending ? "Saving…" : "Check"}</Button> : null}{currentIndex < attempt.questions.length - 1 ? <Button type="button" variant={checkedResult ? "primary" : "secondary"} className={cn("group", compactAction)} disabled={isPending} onClick={() => moveTo(currentIndex + 1)}>Next <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" /></Button> : <Button type="button" variant={checkedResult ? "primary" : "secondary"} className={compactAction} disabled={isPending} onClick={finish}>Finish</Button>}</div></div>;

  return (
    <div className="min-h-screen bg-[#f1f5f3]">
      <header className="sticky top-0 z-40 border-b border-slate-300 bg-[#f1f5f3]/95 backdrop-blur">
        <Container className="flex min-h-16 items-center justify-between gap-4 py-2">
          <div className="flex min-w-0 items-center gap-4"><BrandMark className="!hidden sm:!inline-flex" /><div className="hidden h-7 w-px bg-slate-300 sm:block" /><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Focused practice</p><p className="truncate text-sm font-bold text-slate-900">{attempt.name}</p></div></div>
          <div className="flex shrink-0 gap-2"><Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => router.push("/practice")}>Exit</Button><Button type="button" variant="secondary" size="sm" className="rounded-none" disabled={isPending} onClick={finish}>Finish</Button></div>
        </Container>
      </header>

      <main className="relative isolate overflow-hidden">
        <SubjectMotif slug={question.subject.slug} className={cn("absolute -right-48 top-8 w-[50rem] opacity-[0.055]", tone.accent)} />
        <Container className="relative py-5 sm:py-8 lg:max-w-[92rem]">
          {message ? <div className="mb-5 border-y border-amber-300 bg-amber-50 py-3 text-sm text-amber-900" role="alert">{message}</div> : null}

          <div className="mb-6 flex items-end justify-between border-b border-slate-300 pb-4 lg:hidden">
            <div><p className="font-mono text-4xl font-bold tracking-[-0.06em] text-slate-950">{String(currentIndex + 1).padStart(2, "0")}<span className="text-lg text-slate-400"> / {String(attempt.questions.length).padStart(2, "0")}</span></p><p className="mt-1 text-xs text-slate-500">{checkedCount} checked</p></div>
            <details className="relative"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 border border-slate-300 bg-white/60 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 transition-colors hover:bg-white">Question map <span aria-hidden="true">+</span></summary><QuestionMap attempt={attempt} responses={responses} currentIndex={currentIndex} isPending={isPending} moveTo={moveTo} mobile /></details>
          </div>

          <div className="grid gap-8 lg:grid-cols-[4.5rem_minmax(0,1fr)_18rem] lg:gap-10 xl:gap-14">
            <aside className="hidden flex-col items-center lg:flex" aria-label={`Question ${currentIndex + 1} of ${attempt.questions.length}`}>
              <p className="font-mono text-4xl font-bold tracking-[-0.07em] text-slate-950">{String(currentIndex + 1).padStart(2, "0")}</p><p className="mt-1 font-mono text-xs text-slate-400">/{String(attempt.questions.length).padStart(2, "0")}</p><div className="relative mt-6 h-64 w-px bg-slate-300"><span className={cn("edge-progress absolute inset-0 w-px", tone.glow)} style={{ transform: `scaleY(${progress})` }} /></div><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Sequence</p>
            </aside>

            <section key={question.id} className={cn(direction === "forward" ? "question-enter-forward" : "question-enter-backward", "min-w-0 pb-32 sm:pb-16")} aria-labelledby="practice-question">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-bold uppercase tracking-[0.13em]"><SubjectIcon slug={question.subject.slug} className={cn("size-5", tone.accent)} /><span className={tone.accent}>{question.subject.name}</span><span className="h-px w-5 bg-slate-300" /><span className="text-slate-500">{question.chapter.name}</span>{question.topic ? <><span className="text-slate-300">/</span><span className="text-slate-500">{question.topic.name}</span></> : null}<span className="ml-auto font-mono text-slate-400">{question.difficulty} · +{question.positiveMarks}/−{question.negativeMarks}</span></div>

              <h1 id="practice-question" className="editorial-mask mt-9 max-w-5xl text-[clamp(1.8rem,4vw,3.65rem)] font-black leading-[1.17] tracking-[-0.045em] text-slate-950">{question.questionText}</h1>

              <fieldset className="mt-10 border-b border-slate-300" disabled={Boolean(checkedResult) || isPending}>
                <legend className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Choose one answer</legend>
                {question.options.map((option) => {
                  const selected = response?.selectedOptionId === option.id;
                  const correct = checkedResult?.correctOptionId === option.id;
                  const selectedIncorrect = Boolean(checkedResult && selected && !correct);
                  return <label key={option.id} className={cn("choice-row group grid min-h-16 cursor-pointer grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-slate-300 px-3 py-4 transition-[background-color,border-color,color,transform] focus-within:outline-2 focus-within:outline-offset-[-2px] focus-within:outline-emerald-600 active:scale-[0.995] sm:grid-cols-[3.5rem_minmax(0,1fr)_auto]", !checkedResult && selected && cn(tone.soft, tone.accent, "border-current"), !checkedResult && !selected && "bg-white/45 hover:border-slate-400 hover:bg-white", correct && "border-emerald-500 bg-emerald-50/70 text-emerald-900", selectedIncorrect && "border-rose-500 bg-rose-50/60 text-rose-900", (checkedResult || isPending) && "cursor-default")}><input type="radio" name={`practice-${question.id}`} checked={selected} onChange={() => saveSelection(option.id)} className="sr-only" /><span className={cn("choice-mark grid size-8 place-items-center rounded-full border font-mono text-base font-bold", correct ? "border-emerald-600 bg-emerald-700 text-white" : selectedIncorrect ? "border-rose-500 bg-rose-600 text-white" : selected ? cn(tone.dark, "border-current text-white") : "border-slate-300 bg-white text-slate-600 group-hover:border-slate-500")}>{correct ? <CheckIcon className="size-5" /> : option.optionLabel}</span><span className={cn("text-sm leading-6 sm:text-base", selected || correct || selectedIncorrect ? "font-bold" : "text-slate-800")}>{option.optionText}</span><span className={cn("h-2 w-2 rounded-full transition-[transform,background-color,border-color]", correct ? "scale-125 bg-emerald-500" : selectedIncorrect ? "scale-125 bg-rose-500" : selected ? cn("scale-125", tone.glow) : "border border-slate-300 bg-white")} aria-hidden="true" /></label>;
                })}
              </fieldset>

              <div aria-live="polite">{checkedResult ? <section className={cn("answer-feedback mt-9 grid gap-5 border-y py-6 sm:grid-cols-[10rem_minmax(0,1fr)]", checkedResult.isCorrect ? "border-emerald-400" : "border-rose-400")}><div><p className={cn("text-xs font-bold uppercase tracking-[0.18em]", checkedResult.isCorrect ? "text-emerald-700" : "text-rose-700")}>{checkedResult.isCorrect ? "Resolved / correct" : "Resolved / revisit"}</p><p className="mt-2 font-mono text-4xl font-bold text-slate-950">{checkedResult.isCorrect ? "+4" : `−${question.negativeMarks}`}</p></div><div className="sm:border-l sm:border-slate-300 sm:pl-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Why this answer works</p><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">{checkedResult.explanation ?? "The correct option is marked above. Compare it with your reasoning before moving on."}</p></div></section> : null}</div>

              <div className="mt-10 hidden border-t border-slate-300 pt-6 lg:block">{actionControls}</div>
            </section>

            <aside className="hidden border-l border-slate-300 pl-7 lg:block lg:sticky lg:top-24 lg:self-start"><div className="flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Question map</p><h2 className="mt-1 text-xl font-black text-slate-950">The sequence</h2></div><span className="font-mono text-xs text-slate-500">{checkedCount} checked</span></div><QuestionGrid attempt={attempt} responses={responses} currentIndex={currentIndex} isPending={isPending} moveTo={moveTo} /><p className="mt-5 border-t border-slate-300 pt-4 text-xs leading-5 text-slate-500">Selections and explanations are saved automatically.</p></aside>
          </div>
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-300 bg-[#f1f5f3]/96 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">{actionControls}</div>
        </Container>
      </main>
    </div>
  );
}

function QuestionGrid({ attempt, responses, currentIndex, isPending, moveTo }: { attempt: ActiveAttemptData; responses: Record<string, PracticeResponse>; currentIndex: number; isPending: boolean; moveTo: (index: number) => void }) {
  return <div className="mt-6 grid grid-cols-5 border-l border-t border-slate-300 lg:grid-cols-4">{attempt.questions.map((item, index) => { const saved = responses[item.id]; return <button key={item.id} type="button" disabled={isPending} onClick={() => moveTo(index)} aria-label={`Go to question ${index + 1}`} aria-current={index === currentIndex ? "step" : undefined} className={cn("grid aspect-square cursor-pointer place-items-center border-b border-r border-slate-300 font-mono text-sm font-bold transition-[background-color,color,transform] hover:-translate-y-0.5 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-[-2px]", index === currentIndex && "bg-slate-950 text-white shadow-[inset_0_-3px_0_#34d399]", index !== currentIndex && saved?.checkedResult?.isCorrect && "bg-emerald-50 text-emerald-800", index !== currentIndex && saved?.checkedResult && !saved.checkedResult.isCorrect && "bg-rose-50 text-rose-800", index !== currentIndex && !saved?.checkedResult && saved?.selectedOptionId && "bg-blue-50 text-blue-800", index !== currentIndex && !saved?.selectedOptionId && "bg-white/55 text-slate-700 hover:bg-white")}>{String(index + 1).padStart(2, "0")}</button>; })}</div>;
}

function QuestionMap({ attempt, responses, currentIndex, isPending, moveTo, mobile }: { attempt: ActiveAttemptData; responses: Record<string, PracticeResponse>; currentIndex: number; isPending: boolean; moveTo: (index: number) => void; mobile?: boolean }) {
  return <div className={cn(mobile && "absolute right-0 top-11 z-30 w-[min(21rem,calc(100vw-2rem))] border border-slate-300 bg-[#f1f5f3] p-4 shadow-xl")}><QuestionGrid attempt={attempt} responses={responses} currentIndex={currentIndex} isPending={isPending} moveTo={moveTo} /></div>;
}
