"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { BookIcon, CheckIcon, TargetIcon } from "@/components/ui/icons";
import type { PracticeQuestionCount, PracticeTaxonomy } from "@/server/questions/queries";
import { cn } from "@/lib/utils";
import { startPracticeAttempt } from "@/server/attempts/actions";
import type { ActiveAttemptSummary } from "@/server/attempts/types";
import { SubjectIcon, getSubjectTheme } from "@/components/subjects/subject-visual";

const questionCounts: Array<{ value: PracticeQuestionCount; label: string }> = [
  { value: 5, label: "5" },
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: "all", label: "All available" },
];

export function PracticeSetup({ taxonomy, activeAttempt }: { taxonomy: PracticeTaxonomy; activeAttempt: ActiveAttemptSummary | null }) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(taxonomy[0]?.id ?? "");
  const [chapterId, setChapterId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [count, setCount] = useState<PracticeQuestionCount>(5);
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const subject = useMemo(
    () => taxonomy.find((item) => item.id === subjectId),
    [subjectId, taxonomy],
  );
  const chapter = subject?.chapters.find((item) => item.id === chapterId);

  function changeSubject(nextSubjectId: string) {
    setSubjectId(nextSubjectId);
    setChapterId("");
    setTopicId("");
  }

  function changeChapter(nextChapterId: string) {
    setChapterId(nextChapterId);
    setTopicId("");
  }

  function startPractice() {
    if (!subjectId || isPending) return;
    setMessage(undefined);
    startTransition(async () => {
      const result = await startPracticeAttempt({
        subjectId,
        chapterId: chapterId || undefined,
        topicId: topicId || undefined,
        difficulty: difficulty || undefined,
        count,
      });
      if (result.status === "invalid") {
        setMessage(result.message);
        return;
      }
      router.push(`/practice/attempt/${result.attemptId}`);
    });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
        <Container className="flex h-[4.5rem] items-center justify-between">
          <BrandMark />
          <ButtonLink href="/" variant="ghost" size="sm">Back to site</ButtonLink>
        </Container>
      </header>

      <main>
        <div className="relative overflow-hidden bg-slate-950 py-12 text-white sm:py-16">
          <div className="study-grid absolute inset-0 opacity-60" />
          <div className="ambient-orb absolute -left-24 top-4 size-72 bg-sky-400/10 blur-3xl" />
          <div className="ambient-orb absolute -right-16 bottom-0 size-72 bg-emerald-400/15 blur-3xl" />
          <Container className="reveal-up relative">
            <div className="mx-auto max-w-3xl text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300"><TargetIcon /></span>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">Practice mode</p>
              <h1 className="mt-3 text-4xl font-bold tracking-[-0.045em] text-white sm:text-5xl">Build a focused practice set</h1>
              <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">Choose what to study and check each answer as you go. No timer, no pressure—just a tighter learning loop.</p>
            </div>
          </Container>
        </div>
        <Container className="py-8 sm:py-12">
          <div className="mx-auto max-w-4xl">
            <div className="sr-only">
              <p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-600">Choose what to study and check each answer as you go. There is no timer, and progress is saved to your current browser or student account.</p>
            </div>

            {activeAttempt && (
              <Card className="mt-8 flex flex-col justify-between gap-4 border-green-200 bg-green-50 p-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-green-700">Practice in progress</p>
                  <h2 className="mt-1 font-bold text-slate-950">{activeAttempt.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">Question {activeAttempt.currentQuestionIndex + 1} of {activeAttempt.totalQuestions} · refresh-safe</p>
                </div>
                <ButtonLink href={`/practice/attempt/${activeAttempt.id}`} className="shrink-0">Resume practice</ButtonLink>
              </Card>
            )}

            {message && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">{message}</div>}

            {taxonomy.length === 0 ? (
              <div className="mt-10">
                <EmptyState
                  icon={<BookIcon />}
                  title="No published practice content is available"
                  description="Check the database connection, apply migrations, and import published content before building a practice set."
                  action={<ButtonLink href="/questions" variant="secondary">Open question bank</ButtonLink>}
                />
              </div>
            ) : (
              <Card className="reveal-up reveal-delay-1 -mt-14 overflow-hidden border-0 shadow-[0_28px_80px_rgba(15,23,42,0.14)] sm:-mt-16">
                <div className="h-1.5 bg-[linear-gradient(90deg,#38bdf8_0_33%,#a78bfa_33%_66%,#34d399_66%)]" />
                <div className="p-5 sm:p-8">
                <section>
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><BookIcon className="size-5" /></span>
                    <div><h2 className="font-bold text-slate-950">What do you want to practise?</h2><p className="text-sm text-slate-500">Only subjects with published questions are shown.</p></div>
                  </div>

                  <fieldset className="mt-5">
                    <legend className="text-sm font-semibold text-slate-700">Subject</legend>
                    <div className="mt-2 grid gap-3 sm:grid-cols-3">
                      {taxonomy.map((item) => {
                        const itemTone = getSubjectTheme(item.slug);
                        return (
                        <label key={item.id} className={cn("surface-lift group cursor-pointer rounded-2xl border p-4 text-left transition-all focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-600", subjectId === item.id ? cn(itemTone.border, itemTone.soft, "shadow-md ring-1 ring-current/10") : "border-slate-200 bg-white text-slate-700 hover:border-slate-300")}>
                          <input type="radio" name="practice-subject" value={item.id} checked={subjectId === item.id} onChange={() => changeSubject(item.id)} className="sr-only" />
                          <span className={cn("mb-4 grid size-10 place-items-center rounded-xl", itemTone.soft, itemTone.accent)}><SubjectIcon slug={item.slug} className="size-6" /></span>
                          <span className="font-bold text-slate-950">{item.name}</span>
                          <span className="mt-1 block text-xs text-slate-500">{item.chapters.length} {item.chapters.length === 1 ? "chapter" : "chapters"}</span>
                        </label>
                      )})}
                    </div>
                  </fieldset>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Chapter
                      <select value={chapterId} onChange={(event) => changeChapter(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus-visible:outline-2">
                        <option value="">All available chapters</option>
                        {subject?.chapters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                      Topic
                      <select value={topicId} onChange={(event) => setTopicId(event.target.value)} disabled={!chapterId || !chapter?.topics.length} className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus-visible:outline-2 disabled:bg-slate-100 disabled:text-slate-400">
                        <option value="">All available topics</option>
                        {chapter?.topics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </label>
                  </div>
                </section>

                <div className="my-7 border-t border-slate-200" />

                <section className="grid gap-6 sm:grid-cols-2">
                  <fieldset>
                    <legend className="text-sm font-semibold text-slate-700">Difficulty</legend>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {[{ value: "", label: "Any" }, { value: "EASY", label: "Easy" }, { value: "MEDIUM", label: "Medium" }, { value: "HARD", label: "Hard" }].map((item) => (
                        <label key={item.label} className={cn("cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-medium focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-green-600", difficulty === item.value ? "border-green-600 bg-green-50 text-green-900" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                          <input type="radio" name="practice-difficulty" value={item.value} checked={difficulty === item.value} onChange={() => setDifficulty(item.value)} className="sr-only" />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend className="text-sm font-semibold text-slate-700">Number of questions</legend>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {questionCounts.map((item) => (
                        <label key={item.value} className={cn("cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-medium focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-green-600", count === item.value ? "border-green-600 bg-green-50 text-green-900" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                          <input type="radio" name="practice-count" value={item.value} checked={count === item.value} onChange={() => setCount(item.value)} className="sr-only" />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </section>

                <div className="mt-8 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="flex items-center gap-2 font-semibold text-slate-800"><CheckIcon className="size-4 text-green-700" />Immediate feedback enabled</p>
                  <p className="mt-1 pl-6">Answers, checked explanations, and your current position are restored after refresh.</p>
                </div>

                <Button type="button" size="lg" className="mt-6 w-full" disabled={isPending} onClick={startPractice}>{isPending ? "Creating saved practice..." : "Start practice"}</Button>
                </div>
              </Card>
            )}
          </div>
        </Container>
      </main>
    </div>
  );
}
