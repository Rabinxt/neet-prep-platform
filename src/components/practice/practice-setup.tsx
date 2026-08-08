"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { BookIcon, CheckIcon, TargetIcon } from "@/components/ui/icons";
import type { PracticeQuestionCount, PracticeTaxonomy } from "@/server/questions/queries";
import { cn } from "@/lib/utils";

const questionCounts: Array<{ value: PracticeQuestionCount; label: string }> = [
  { value: 5, label: "5" },
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: "all", label: "All available" },
];

export function PracticeSetup({ taxonomy }: { taxonomy: PracticeTaxonomy }) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(taxonomy[0]?.id ?? "");
  const [chapterId, setChapterId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [count, setCount] = useState<PracticeQuestionCount>(5);

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
    if (!subjectId) return;

    const params = new URLSearchParams({
      start: "1",
      subjectId,
      count: String(count),
    });
    if (chapterId) params.set("chapterId", chapterId);
    if (topicId) params.set("topicId", topicId);
    if (difficulty) params.set("difficulty", difficulty);
    router.push(`/practice?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <Container className="flex h-16 items-center justify-between">
          <BrandMark />
          <ButtonLink href="/" variant="ghost" size="sm">Back to site</ButtonLink>
        </Container>
      </header>

      <main>
        <Container className="py-10 sm:py-14">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-green-100 text-green-700"><TargetIcon /></span>
              <p className="mt-5 text-sm font-bold uppercase tracking-wider text-green-700">Practice mode</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Build a focused practice set</h1>
              <p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-600">Choose what to study and check each answer as you go. There is no timer and nothing is saved to an account.</p>
            </div>

            {taxonomy.length === 0 ? (
              <Card className="mt-10 border-dashed p-8 text-center">
                <h2 className="text-lg font-bold text-slate-900">No published practice content is available</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Check the database connection and ensure published questions have been seeded.</p>
                <ButtonLink href="/questions" variant="secondary" className="mt-5">Open question bank</ButtonLink>
              </Card>
            ) : (
              <Card className="mt-10 p-5 sm:p-7">
                <section>
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><BookIcon className="size-5" /></span>
                    <div><h2 className="font-bold text-slate-950">What do you want to practise?</h2><p className="text-sm text-slate-500">Only subjects with published questions are shown.</p></div>
                  </div>

                  <fieldset className="mt-5">
                    <legend className="text-sm font-semibold text-slate-700">Subject</legend>
                    <div className="mt-2 grid gap-3 sm:grid-cols-3">
                      {taxonomy.map((item) => (
                        <label key={item.id} className={cn("cursor-pointer rounded-xl border p-4 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-green-600", subjectId === item.id ? "border-green-600 bg-green-50 text-green-900" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300")}>
                          <input type="radio" name="practice-subject" value={item.id} checked={subjectId === item.id} onChange={() => changeSubject(item.id)} className="sr-only" />
                          <span className="font-bold">{item.name}</span>
                          <span className="mt-1 block text-xs opacity-70">{item.chapters.length} {item.chapters.length === 1 ? "chapter" : "chapters"}</span>
                        </label>
                      ))}
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
                  <p className="mt-1 pl-6">Answers and progress remain only in this browser tab for the current session.</p>
                </div>

                <Button type="button" size="lg" className="mt-6 w-full" onClick={startPractice}>Start practice</Button>
              </Card>
            )}
          </div>
        </Container>
      </main>
    </div>
  );
}
