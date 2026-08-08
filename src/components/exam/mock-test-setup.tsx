"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClockIcon, TargetIcon } from "@/components/ui/icons";
import { formatExamDuration, getExamDurationSeconds } from "@/lib/exam-config";
import { cn } from "@/lib/utils";
import { startExamAttempt } from "@/server/attempts/actions";
import type { ActiveAttemptSummary } from "@/server/attempts/types";
import { SubjectIcon, getSubjectTheme } from "@/components/subjects/subject-visual";

export type ExamPreset = {
  id: "mixed" | "physics" | "chemistry" | "biology";
  name: string;
  description: string;
  availableCount: number;
  subjects: string[];
  markingSchemes: string[];
};

function countOptions(available: number) {
  return [5, 10, 20].filter((count) => count < available);
}

export function MockTestSetup({ presets, activeAttempt }: { presets: ExamPreset[]; activeAttempt: ActiveAttemptSummary | null }) {
  const router = useRouter();
  const [presetId, setPresetId] = useState(presets[0]?.id ?? "mixed");
  const [count, setCount] = useState<string>("all");
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const preset = useMemo(
    () => presets.find((item) => item.id === presetId) ?? presets[0],
    [presetId, presets],
  );

  if (!preset) {
    return (
      <Card className="border-dashed p-8 text-center">
        <h2 className="text-lg font-bold text-slate-900">No published questions are available</h2>
        <p className="mt-2 text-sm text-slate-500">Seed or publish question-bank content before starting a development exam.</p>
      </Card>
    );
  }

  const actualCount = count === "all"
    ? preset.availableCount
    : Math.min(Number(count), preset.availableCount);
  const duration = getExamDurationSeconds(actualCount);

  function choosePreset(nextPresetId: ExamPreset["id"]) {
    setPresetId(nextPresetId);
    setCount("all");
  }

  function startExam() {
    if (isPending) return;
    setMessage(undefined);
    startTransition(async () => {
      const parsedCount = count === "all" ? "all" : Number(count) as 5 | 10 | 20;
      const result = await startExamAttempt({ examType: preset.id, count: parsedCount });
      if (result.status === "invalid") {
        setMessage(result.message);
        return;
      }
      router.push(`/mock-tests/attempt/${result.attemptId}`);
    });
  }

  return (
    <div>
      {activeAttempt && (
        <Card className="mb-8 flex flex-col justify-between gap-4 border-blue-200 bg-blue-50 p-5 sm:flex-row sm:items-center">
          <div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Exam in progress</p><h2 className="mt-1 font-bold text-slate-950">{activeAttempt.name}</h2><p className="mt-1 text-sm text-slate-600">Question {activeAttempt.currentQuestionIndex + 1} of {activeAttempt.totalQuestions} · server-timed</p></div>
          <Button type="button" className="shrink-0" onClick={() => router.push(`/mock-tests/attempt/${activeAttempt.id}`)}>Resume exam</Button>
        </Card>
      )}
      {message && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">{message}</div>}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section>
        <h2 className="text-xl font-bold text-slate-950">Choose a development test</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">These tests use SAMPLE question-bank content and are not official NEET papers.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {presets.map((item) => {
            const tone = getSubjectTheme(item.id);
            return (
            <button
              key={item.id}
              type="button"
              onClick={() => choosePreset(item.id)}
              aria-pressed={preset.id === item.id}
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600",
                preset.id === item.id
                  ? item.id === "mixed" ? "border-slate-700 bg-slate-950 text-white shadow-lg" : cn(tone.border, tone.soft, "shadow-md")
                  : "border-slate-200 bg-white hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("grid size-11 place-items-center rounded-xl", item.id === "mixed" ? "bg-white/10 text-emerald-300" : cn(tone.soft, tone.accent))}>{item.id === "mixed" ? <TargetIcon /> : <SubjectIcon slug={item.id} className="size-6" />}</span>
                <span className={cn("text-xs font-bold", preset.id === item.id && item.id === "mixed" ? "text-slate-400" : "text-slate-500")}>{item.availableCount} Qs</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Badge tone="blue" className="mt-4">Development SAMPLE</Badge>
              </div>
              <h3 className={cn("mt-4 font-bold", preset.id === item.id && item.id === "mixed" ? "text-white" : "text-slate-950")}>{item.name}</h3>
              <p className={cn("mt-2 text-sm leading-6", preset.id === item.id && item.id === "mixed" ? "text-slate-400" : "text-slate-600")}>{item.description}</p>
            </button>
          )})}
        </div>

        <fieldset className="mt-8">
          <legend className="font-bold text-slate-950">Number of questions</legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {countOptions(preset.availableCount).map((value) => (
              <label key={value} className={cn("cursor-pointer rounded-xl border px-5 py-3 text-sm font-bold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-green-600", count === String(value) ? "border-green-600 bg-green-50 text-green-900" : "border-slate-200 bg-white text-slate-700")}>
                <input type="radio" name="exam-count" className="sr-only" value={value} checked={count === String(value)} onChange={() => setCount(String(value))} />
                {value} questions
              </label>
            ))}
            <label className={cn("cursor-pointer rounded-xl border px-5 py-3 text-sm font-bold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-green-600", count === "all" ? "border-green-600 bg-green-50 text-green-900" : "border-slate-200 bg-white text-slate-700")}>
              <input type="radio" name="exam-count" className="sr-only" value="all" checked={count === "all"} onChange={() => setCount("all")} />
              All available ({preset.availableCount})
            </label>
          </div>
        </fieldset>
      </section>

      <aside>
        <Card className="overflow-hidden border-0 p-6 shadow-[0_20px_55px_rgba(15,23,42,0.10)] lg:sticky lg:top-24">
          <div className="-mx-6 -mt-6 mb-6 bg-slate-950 px-6 py-5 text-white">
          <p className="text-xs font-bold uppercase tracking-wider text-green-700">Before you start</p>
          <h2 className="mt-2 text-xl font-bold text-white">{preset.name}</h2>
          </div>
          <dl className="mt-6 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4"><dt className="flex items-center gap-2 text-slate-500"><TargetIcon className="size-4" />Questions</dt><dd className="font-bold text-slate-900">{actualCount}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="flex items-center gap-2 text-slate-500"><ClockIcon className="size-4" />Duration</dt><dd className="font-bold text-slate-900">{formatExamDuration(duration)}</dd></div>
            <div className="border-t border-slate-200 pt-4"><dt className="text-slate-500">Subjects included</dt><dd className="mt-1 font-semibold text-slate-900">{preset.subjects.join(", ")}</dd></div>
            <div><dt className="text-slate-500">Marking scheme</dt><dd className="mt-1 font-semibold text-slate-900">{preset.markingSchemes.join(", ")} per question</dd></div>
          </dl>
          <div className="mt-6 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-900">
            A countdown starts immediately. Correct answers and explanations remain hidden until final submission.
          </div>
          <Button type="button" size="lg" className="mt-6 w-full" disabled={isPending} onClick={startExam}>{isPending ? "Creating saved exam..." : "Start exam"}</Button>
        </Card>
      </aside>
      </div>
    </div>
  );
}
