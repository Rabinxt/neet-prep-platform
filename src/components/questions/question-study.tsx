"use client";

import { useState, useTransition } from "react";
import { SubjectIcon, getSubjectTheme } from "@/components/subjects/subject-visual";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowRightIcon, BookIcon, CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { checkQuestionAnswer, type AnswerCheckResult } from "@/server/questions/actions";
import type { PublicQuestion } from "@/server/questions/queries";

type SavedAnswer = {
  selectedOptionId: string;
  result?: AnswerCheckResult;
};

const difficultyStyles = {
  EASY: "text-emerald-700",
  MEDIUM: "text-amber-700",
  HARD: "text-rose-700",
};

function QuestionIndex({ questions, answers, currentIndex, accent, glow, soft, onSelect }: { questions: PublicQuestion[]; answers: Record<string, SavedAnswer>; currentIndex: number; accent: string; glow: string; soft: string; onSelect: (index: number) => void }) {
  return (
    <div className="question-index-enter border-t border-slate-300">
      {questions.map((item, index) => {
        const saved = answers[item.id];
        const isChecked = saved?.result?.status === "checked";
        const selected = index === currentIndex;
        return (
          <button key={item.id} type="button" onClick={() => onSelect(index)} aria-label={`Open question ${index + 1}: ${item.questionText}`} aria-current={selected ? "step" : undefined} className={cn("group relative grid min-h-20 w-full cursor-pointer grid-cols-[2.2rem_minmax(0,1fr)_auto_auto] items-start gap-3 border-b border-slate-200 px-2 py-4 text-left transition-[background-color,padding,transform] duration-200 focus-visible:outline-2 focus-visible:outline-emerald-600 active:scale-[0.995]", selected ? cn(soft, "pl-4") : "bg-white/40 hover:bg-white hover:pl-4")}>
            {selected ? <span className={cn("active-travel absolute inset-y-0 left-0 w-1 origin-center", glow)} /> : null}
            <span className={cn("font-mono text-xs font-bold", selected ? accent : "text-slate-400")}>{String(index + 1).padStart(2, "0")}</span>
            <span className="min-w-0"><span className={cn("line-clamp-2 text-sm leading-5", selected ? "font-bold text-slate-950" : "font-medium text-slate-600")}>{item.questionText}</span><span className="mt-2 flex flex-wrap gap-x-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400"><span className={difficultyStyles[item.difficulty]}>{item.difficulty.toLowerCase()}</span><span>{item.chapter.name}</span>{item.topic ? <span>{item.topic.name}</span> : null}</span></span>
            <span className={cn("mt-0.5 size-2 rounded-full", isChecked ? "bg-emerald-500" : saved ? "bg-sky-400" : "bg-slate-300")} aria-label={isChecked ? "Checked" : saved ? "Answer selected" : "Not answered"} />
            <ArrowRightIcon className={cn("interaction-arrow -mt-0.5 size-4", selected ? accent : "text-slate-400")} />
          </button>
        );
      })}
    </div>
  );
}

export function QuestionStudy({ questions }: { questions: PublicQuestion[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [answers, setAnswers] = useState<Record<string, SavedAnswer>>({});
  const [isPending, startTransition] = useTransition();

  if (questions.length === 0) {
    return <EmptyState icon={<BookIcon />} title="No published questions found" description="Try a broader chapter, topic, difficulty, or year filter. Imported content must also be published before it appears here." />;
  }

  const question = questions[currentIndex];
  const answer = answers[question.id];
  const checkedResult = answer?.result?.status === "checked" ? answer.result : undefined;
  const invalidResult = answer?.result?.status === "invalid" ? answer.result : undefined;
  const tone = getSubjectTheme(question.subject.slug);

  function selectOption(optionId: string) {
    if (checkedResult) return;
    setAnswers((current) => ({ ...current, [question.id]: { selectedOptionId: optionId } }));
  }

  function checkAnswer() {
    if (!answer?.selectedOptionId || checkedResult) return;
    startTransition(async () => {
      const result = await checkQuestionAnswer({ questionId: question.id, optionId: answer.selectedOptionId });
      setAnswers((current) => ({ ...current, [question.id]: { selectedOptionId: answer.selectedOptionId, result } }));
    });
  }

  function goToQuestion(index: number) {
    if (index === currentIndex) return;
    setDirection(index > currentIndex ? "forward" : "backward");
    setCurrentIndex(index);
    window.requestAnimationFrame(() => document.getElementById("question-reading-workspace")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  }

  return (
    <section className="py-10 sm:py-14" aria-label="Question study workspace">
      <div className="grid items-start lg:grid-cols-[minmax(17rem,0.52fr)_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:pr-8">
          <div className="hidden lg:block">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Question index</p>
            <p className="mb-5 mt-2 text-xs leading-5 text-slate-500">Select a row to move through this syllabus set. Your choices stay here.</p>
            <div className="max-h-[calc(100vh-13rem)] overflow-y-auto pr-2">
              <QuestionIndex questions={questions} answers={answers} currentIndex={currentIndex} accent={tone.accent} glow={tone.glow} soft={tone.soft} onSelect={goToQuestion} />
            </div>
            <p className="mt-4 text-[10px] leading-5 text-slate-400"><span className="mr-1.5 inline-block size-2 rounded-full bg-emerald-500" />Checked <span className="ml-3 mr-1.5 inline-block size-2 rounded-full bg-sky-400" />Selected</p>
          </div>
          <details className="mb-8 border-y border-slate-300 lg:hidden">
            <summary className="flex min-h-14 cursor-pointer items-center justify-between bg-white/50 px-3 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-white"><span>Browse {questions.length} questions</span><span className="inline-flex items-center gap-2 font-mono text-emerald-700">{String(currentIndex + 1).padStart(2, "0")} / {String(questions.length).padStart(2, "0")}<span aria-hidden="true">+</span></span></summary>
            <div className="pb-4"><QuestionIndex questions={questions} answers={answers} currentIndex={currentIndex} accent={tone.accent} glow={tone.glow} soft={tone.soft} onSelect={goToQuestion} /></div>
          </details>
        </aside>

        <article id="question-reading-workspace" className="scroll-mt-24 border-slate-300 lg:min-h-[44rem] lg:border-l lg:pl-10 xl:pl-14">
          <div className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-300 pb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Question {currentIndex + 1} of {questions.length}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500"><SubjectIcon slug={question.subject.slug} className={cn("size-5", tone.accent)} /><span className={cn("font-bold", tone.accent)}>{question.subject.name}</span><span>·</span><span>{question.chapter.name}</span>{question.topic ? <><span>·</span><span>{question.topic.name}</span></> : null}</div>
            </div>
            <div className="text-right text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"><p className={difficultyStyles[question.difficulty]}>{question.difficulty}</p><p className="mt-1">{question.sourceType === "SAMPLE" ? "Development sample" : question.sourceType}{question.examYear ? ` · ${question.examYear}` : ""}</p><p className="mt-1">+{question.positiveMarks} / −{question.negativeMarks}</p></div>
          </div>

          <div className="mt-1 h-1 bg-slate-200"><div className={cn("progress-fill h-full origin-left", tone.glow)} style={{ transform: `scaleX(${(currentIndex + 1) / questions.length})` }} /></div>

          <div key={question.id} className={cn(direction === "forward" ? "question-enter-forward" : "question-enter-backward", "pt-9")}>
            <h2 className="max-w-4xl text-[clamp(1.45rem,3vw,2.25rem)] font-black leading-[1.3] tracking-[-0.025em] text-slate-950">{question.questionText}</h2>

            <fieldset className="mt-9" disabled={Boolean(checkedResult) || isPending}>
              <legend className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Choose one answer</legend>
              {question.options.map((option) => {
                const isSelected = answer?.selectedOptionId === option.id;
                const isCorrectOption = checkedResult?.correctOptionId === option.id;
                const isSelectedIncorrect = Boolean(checkedResult && isSelected && !isCorrectOption);
                return (
                  <label key={option.id} className={cn("choice-row group flex min-h-16 cursor-pointer items-center gap-4 border-t border-slate-300 px-4 py-4 last:border-b focus-within:outline-2 focus-within:outline-emerald-600", !checkedResult && isSelected && cn(tone.soft, tone.accent, tone.border), !checkedResult && !isSelected && "bg-white/45 hover:border-slate-400 hover:bg-white", isCorrectOption && "bg-emerald-50 text-emerald-950", isSelectedIncorrect && "bg-rose-50 text-rose-950", (checkedResult || isPending) && "cursor-default")}>
                    <input type="radio" name={`answer-${question.id}`} value={option.id} checked={isSelected} onChange={() => selectOption(option.id)} className="sr-only" />
                    <span className={cn("choice-mark grid size-8 shrink-0 place-items-center rounded-full border text-sm font-bold", isCorrectOption ? "border-emerald-600 bg-emerald-700 text-white" : isSelectedIncorrect ? "border-rose-500 bg-rose-600 text-white" : isSelected ? cn(tone.dark, "border-current text-white") : "border-slate-300 bg-white text-slate-700 group-hover:border-slate-500 group-hover:bg-slate-50")}>
                      {isCorrectOption ? <CheckIcon className="size-4" /> : option.optionLabel}
                    </span>
                    <span className="text-sm leading-6 sm:text-base">{option.optionText}</span>
                  </label>
                );
              })}
            </fieldset>

            <div className="mt-7" aria-live="polite">
              {checkedResult ? <div className={cn("answer-feedback border-l-4 py-2 pl-5", checkedResult.isCorrect ? "border-emerald-500" : "border-rose-500")}><p className={cn("text-lg font-black", checkedResult.isCorrect ? "text-emerald-900" : "text-rose-900")}>{checkedResult.isCorrect ? "Correct answer" : "Not quite — review the correct option above"}</p>{checkedResult.explanation ? <div className="mt-4 max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Explanation</p><p className="mt-2 text-sm leading-7 text-slate-700">{checkedResult.explanation}</p></div> : null}</div> : null}
              {invalidResult ? <p className="border-l-4 border-amber-400 py-2 pl-5 text-sm text-amber-900">{invalidResult.message}</p> : null}
            </div>

            <div className="mt-10 flex flex-col-reverse justify-between gap-3 border-t border-slate-300 pt-6 sm:flex-row">
              <Button type="button" variant="secondary" className="rounded-none" disabled={currentIndex === 0 || isPending} onClick={() => goToQuestion(currentIndex - 1)}><ArrowRightIcon className="size-4 rotate-180" />Previous</Button>
              <div className="flex gap-3">{!checkedResult ? <Button type="button" className="flex-1 rounded-none sm:flex-none" disabled={!answer?.selectedOptionId || isPending} onClick={checkAnswer}>{isPending ? "Checking…" : "Check answer"}</Button> : null}<Button type="button" variant={checkedResult ? "primary" : "secondary"} className="flex-1 rounded-none sm:flex-none" disabled={currentIndex === questions.length - 1 || isPending} onClick={() => goToQuestion(currentIndex + 1)}>Next<ArrowRightIcon className="size-4" /></Button></div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
