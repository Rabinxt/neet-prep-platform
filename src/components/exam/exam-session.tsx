"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { ArrowRightIcon, ClockIcon } from "@/components/ui/icons";
import { formatCountdown, useExamTimer } from "@/hooks/use-exam-timer";
import { EXAM_LOW_TIME_WARNING_SECONDS } from "@/lib/exam-config";
import { finishAttempt, saveExamResponse, setAttemptCurrentQuestion } from "@/server/attempts/actions";
import type { ActiveAttemptData, AttemptQuestionStatusValue } from "@/server/attempts/types";
import { cn } from "@/lib/utils";

type ExamResponse = {
  draftOptionId: string | null;
  savedOptionId: string | null;
  status: AttemptQuestionStatusValue;
};

const statusStyles: Record<AttemptQuestionStatusValue, string> = {
  NOT_VISITED: "border-slate-200 bg-white text-slate-600",
  NOT_ANSWERED: "border-red-200 bg-red-50 text-red-800",
  ANSWERED: "border-green-600 bg-green-600 text-white",
  MARKED_FOR_REVIEW: "border-violet-500 bg-violet-100 text-violet-800",
  ANSWERED_AND_MARKED_FOR_REVIEW: "border-violet-600 bg-violet-600 text-white ring-2 ring-green-300",
};

const legend: Array<{ status: AttemptQuestionStatusValue; label: string }> = [
  { status: "NOT_VISITED", label: "Not visited" },
  { status: "NOT_ANSWERED", label: "Not answered" },
  { status: "ANSWERED", label: "Answered" },
  { status: "MARKED_FOR_REVIEW", label: "Marked for review" },
  { status: "ANSWERED_AND_MARKED_FOR_REVIEW", label: "Answered + review" },
];

export function ExamSession({ attempt }: { attempt: ActiveAttemptData }) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(attempt.currentQuestionIndex);
  const [responses, setResponses] = useState<Record<string, ExamResponse>>(() => (
    Object.fromEntries(attempt.questions.map((question) => [question.id, {
      draftOptionId: question.selectedOptionId,
      savedOptionId: question.selectedOptionId,
      status: question.responseStatus,
    }]))
  ));
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const expiryHandled = useRef(false);

  const remainingSeconds = useExamTimer({
    expiresAt: attempt.expiresAt!,
    serverNow: attempt.serverNow,
    active: !isPending,
    onExpire: () => {
      if (expiryHandled.current) return;
      expiryHandled.current = true;
      setShowSubmitDialog(false);
      setMessage("Time is up. The server is finalizing your saved responses.");
      submitExam();
    },
  });
  const locked = remainingSeconds === 0 || isPending;
  const question = attempt.questions[currentIndex];
  const response = responses[question.id];

  const subjects = useMemo(() => {
    const seen = new Map<string, { name: string; slug: string; firstIndex: number }>();
    attempt.questions.forEach((item, index) => {
      if (!seen.has(item.subject.slug)) seen.set(item.subject.slug, { ...item.subject, firstIndex: index });
    });
    return [...seen.values()];
  }, [attempt.questions]);

  const counts = useMemo(() => {
    let answered = 0;
    let notAnswered = 0;
    let marked = 0;
    let notVisited = 0;
    for (const item of attempt.questions) {
      const status = responses[item.id].status;
      if (status === "ANSWERED" || status === "ANSWERED_AND_MARKED_FOR_REVIEW") answered += 1;
      if (status === "NOT_ANSWERED") notAnswered += 1;
      if (status === "MARKED_FOR_REVIEW" || status === "ANSWERED_AND_MARKED_FOR_REVIEW") marked += 1;
      if (status === "NOT_VISITED") notVisited += 1;
    }
    return { answered, notAnswered, marked, notVisited };
  }, [attempt.questions, responses]);

  function selectOption(optionId: string) {
    if (locked) return;
    setResponses((current) => ({
      ...current,
      [question.id]: { ...current[question.id], draftOptionId: optionId },
    }));
  }

  function persist(intent: "SAVE" | "REVIEW" | "CLEAR") {
    if (locked) return;
    const nextIndex = intent === "CLEAR"
      ? currentIndex
      : Math.min(currentIndex + 1, attempt.questions.length - 1);
    const selectedOptionId = intent === "CLEAR" ? null : response.draftOptionId;
    setMessage(undefined);
    startTransition(async () => {
      const result = await saveExamResponse({
        attemptId: attempt.id,
        questionId: question.id,
        optionId: selectedOptionId,
        intent,
        nextIndex,
      });
      if (result.status === "completed") {
        router.refresh();
        return;
      }
      if (result.status === "invalid") {
        setMessage(result.message);
        router.refresh();
        return;
      }
      const status: AttemptQuestionStatusValue = intent === "REVIEW"
        ? selectedOptionId ? "ANSWERED_AND_MARKED_FOR_REVIEW" : "MARKED_FOR_REVIEW"
        : intent === "CLEAR"
          ? ["MARKED_FOR_REVIEW", "ANSWERED_AND_MARKED_FOR_REVIEW"].includes(response.status)
            ? "MARKED_FOR_REVIEW"
            : "NOT_ANSWERED"
          : selectedOptionId ? "ANSWERED" : "NOT_ANSWERED";
      setResponses((current) => ({
        ...current,
        [question.id]: {
          draftOptionId: selectedOptionId,
          savedOptionId: selectedOptionId,
          status,
        },
        ...(intent !== "CLEAR" && currentIndex < attempt.questions.length - 1 && attempt.questions[nextIndex]
          ? {
              [attempt.questions[nextIndex].id]: {
                ...current[attempt.questions[nextIndex].id],
                status: current[attempt.questions[nextIndex].id].status === "NOT_VISITED"
                  ? "NOT_ANSWERED"
                  : current[attempt.questions[nextIndex].id].status,
              },
            }
          : {}),
      }));
      if (intent !== "CLEAR" && currentIndex < attempt.questions.length - 1) {
        setCurrentIndex(nextIndex);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (intent !== "CLEAR") {
        setShowSubmitDialog(true);
      }
    });
  }

  function moveTo(index: number) {
    if (locked || !attempt.questions[index]) return;
    setCurrentIndex(index);
    setResponses((current) => ({
      ...current,
      [attempt.questions[index].id]: {
        ...current[attempt.questions[index].id],
        status: current[attempt.questions[index].id].status === "NOT_VISITED"
          ? "NOT_ANSWERED"
          : current[attempt.questions[index].id].status,
      },
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
    startTransition(async () => {
      const result = await setAttemptCurrentQuestion({ attemptId: attempt.id, type: "MOCK_EXAM", currentIndex: index });
      if (result.status === "completed") router.refresh();
      if (result.status === "invalid") setMessage(result.message);
    });
  }

  function submitExam() {
    setShowSubmitDialog(false);
    startTransition(async () => {
      const result = await finishAttempt({ attemptId: attempt.id, type: "MOCK_EXAM" });
      if (result.status === "invalid") {
        setMessage(result.message);
        expiryHandled.current = false;
        return;
      }
      router.refresh();
    });
  }

  const hasUnsavedChange = response.draftOptionId !== response.savedOptionId;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-300 bg-white">
        <Container className="flex min-h-16 items-center justify-between gap-3 py-2">
          <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Saved development exam</p><h1 className="truncate text-sm font-bold text-slate-950 sm:text-base">{attempt.name}</h1></div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className={cn("rounded-xl border px-3 py-2 text-center", remainingSeconds <= EXAM_LOW_TIME_WARNING_SECONDS ? "border-red-300 bg-red-50 text-red-800" : "border-slate-200 bg-slate-50 text-slate-800")} aria-label={`${formatCountdown(remainingSeconds)} remaining`}>
              <p className="hidden text-[10px] font-bold uppercase tracking-wider sm:block">Server time remaining</p>
              <p className="font-mono text-sm font-bold tabular-nums sm:text-base"><ClockIcon className="mr-1 inline size-4" />{formatCountdown(remainingSeconds)}</p>
            </div>
            <Button type="button" size="sm" disabled={isPending} onClick={() => setShowSubmitDialog(true)}>Submit Test</Button>
          </div>
        </Container>
      </header>

      <main><Container className="py-4 sm:py-6">
        {message && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900" role="status">{message}</div>}
        {subjects.length > 1 && <nav className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Exam sections">{subjects.map((subject) => <button key={subject.slug} type="button" disabled={locked} onClick={() => moveTo(subject.firstIndex)} aria-current={question.subject.slug === subject.slug ? "page" : undefined} className={cn("shrink-0 rounded-xl border px-4 py-2 text-sm font-bold focus-visible:outline-2", question.subject.slug === subject.slug ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700")}>{subject.name}</button>)}</nav>}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Card className="overflow-hidden rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 sm:px-6"><p className="font-bold text-slate-900">Question {currentIndex + 1} of {attempt.questions.length}</p><p className="text-sm font-semibold text-slate-500">Marks: +{question.positiveMarks} · -{question.negativeMarks}</p></div>
            <div className="p-5 sm:p-7">
              <p className="text-xs font-semibold text-slate-500">{question.subject.name} · {question.chapter.name}{question.topic ? ` · ${question.topic.name}` : ""}</p>
              <h2 className="mt-4 text-lg font-bold leading-8 text-slate-950 sm:text-xl">{question.questionText}</h2>
              <fieldset className="mt-7 space-y-3" disabled={locked}>
                <legend className="sr-only">Choose one answer</legend>
                {question.options.map((option) => {
                  const selected = response.draftOptionId === option.id;
                  return <label key={option.id} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600", selected ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50", locked && "cursor-default")}><input type="radio" className="sr-only" name={`exam-${question.id}`} checked={selected} onChange={() => selectOption(option.id)} /><span className={cn("grid size-7 shrink-0 place-items-center rounded-lg border text-sm font-bold", selected ? "border-blue-600 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-600")}>{option.optionLabel}</span><span className="pt-0.5 text-sm leading-6 text-slate-800 sm:text-base">{option.optionText}</span></label>;
                })}
              </fieldset>
              {hasUnsavedChange && <p className="mt-4 text-xs font-semibold text-amber-700">This selection is not saved yet. Use Save &amp; Next or Mark for Review &amp; Next.</p>}
            </div>
            <div className="border-t border-slate-200 bg-slate-50 p-4 sm:px-6"><div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={currentIndex === 0 || locked} onClick={() => moveTo(currentIndex - 1)}><ArrowRightIcon className="size-4 rotate-180" /> Previous</Button><Button type="button" variant="ghost" disabled={locked || (!response.draftOptionId && !response.savedOptionId)} onClick={() => persist("CLEAR")}>Clear Response</Button></div>
              <div className="flex flex-col gap-2 sm:flex-row"><Button type="button" variant="secondary" disabled={locked} onClick={() => persist("REVIEW")}>Mark for Review &amp; Next</Button><Button type="button" disabled={locked} onClick={() => persist("SAVE")}>Save &amp; Next <ArrowRightIcon className="size-4" /></Button></div>
            </div></div>
          </Card>

          <aside><Card className="rounded-xl p-5 lg:sticky lg:top-24">
            <div className="flex items-center justify-between"><h2 className="font-bold text-slate-950">Question palette</h2><span className="text-xs text-slate-500">{attempt.questions.length} total</span></div>
            <div className="mt-4 grid grid-cols-5 gap-2">{attempt.questions.map((item, index) => <button key={item.id} type="button" disabled={locked} onClick={() => moveTo(index)} aria-label={`Question ${index + 1}: ${responses[item.id].status.toLowerCase().replaceAll("_", " ")}`} aria-current={index === currentIndex ? "step" : undefined} className={cn("grid aspect-square place-items-center rounded-lg border text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600", statusStyles[responses[item.id].status], index === currentIndex && "outline-2 outline-offset-2 outline-slate-900")}>{index + 1}</button>)}</div>
            <div className="mt-5 space-y-2 border-t border-slate-200 pt-4">{legend.map((item) => <div key={item.status} className="flex items-center gap-2 text-xs text-slate-600"><span className={cn("size-5 rounded-md border", statusStyles[item.status])} /><span>{item.label}</span></div>)}</div>
            <p className="mt-4 text-xs leading-5 text-slate-500">Saved responses and review states survive refresh. Unsaved selections do not.</p>
          </Card></aside>
        </div>
      </Container></main>

      {showSubmitDialog && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !locked) setShowSubmitDialog(false); }}><Card role="dialog" aria-modal="true" aria-labelledby="submit-title" className="w-full max-w-lg p-6 shadow-2xl"><h2 id="submit-title" className="text-xl font-bold text-slate-950">Submit this saved test?</h2><p className="mt-2 text-sm leading-6 text-slate-500">Only server-saved responses will be evaluated. Submission is final and safe to retry.</p><div className="mt-5 grid grid-cols-2 gap-3 text-center sm:grid-cols-4"><div className="rounded-xl bg-green-50 p-3"><p className="text-xl font-bold text-green-800">{counts.answered}</p><p className="text-xs text-green-700">Answered</p></div><div className="rounded-xl bg-red-50 p-3"><p className="text-xl font-bold text-red-800">{counts.notAnswered}</p><p className="text-xs text-red-700">Not answered</p></div><div className="rounded-xl bg-violet-50 p-3"><p className="text-xl font-bold text-violet-800">{counts.marked}</p><p className="text-xs text-violet-700">Marked</p></div><div className="rounded-xl bg-slate-100 p-3"><p className="text-xl font-bold text-slate-800">{counts.notVisited}</p><p className="text-xs text-slate-600">Not visited</p></div></div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" disabled={locked} onClick={() => setShowSubmitDialog(false)}>Continue Exam</Button><Button type="button" disabled={isPending} onClick={submitExam}>{isPending ? "Submitting..." : "Submit Test"}</Button></div></Card></div>}
    </div>
  );
}
