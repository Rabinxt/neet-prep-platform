"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { PracticeTaxonomy } from "@/server/questions/queries";

export function QuestionFilters({ taxonomy, initial }: { taxonomy: PracticeTaxonomy; initial: { subjectSlug?: string; chapterId?: string; topicId?: string; difficulty?: string; examYear?: number } }) {
  const router = useRouter();
  const initialSubject = taxonomy.find((item) => item.slug === initial.subjectSlug) ?? taxonomy[0];
  const [subjectId, setSubjectId] = useState(initialSubject?.id ?? "");
  const [chapterId, setChapterId] = useState(initial.chapterId ?? "");
  const [topicId, setTopicId] = useState(initial.topicId ?? "");
  const [difficulty, setDifficulty] = useState(initial.difficulty ?? "");
  const [examYear, setExamYear] = useState(initial.examYear ? String(initial.examYear) : "");
  const subject = useMemo(() => taxonomy.find((item) => item.id === subjectId), [subjectId, taxonomy]);
  const chapter = subject?.chapters.find((item) => item.id === chapterId);

  function applyFilters() {
    if (!subject) return;
    const params = new URLSearchParams({ subject: subject.slug });
    if (chapterId) params.set("chapter", chapterId);
    if (topicId) params.set("topic", topicId);
    if (difficulty) params.set("difficulty", difficulty);
    if (examYear) params.set("year", examYear);
    router.push(`/questions?${params.toString()}`);
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)]">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1.2fr_1.2fr_0.8fr_0.7fr_auto]">
        <FilterSelect label="Subject" value={subjectId} onChange={(value) => { setSubjectId(value); setChapterId(""); setTopicId(""); }}>
          {taxonomy.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </FilterSelect>
        <FilterSelect label="Chapter" value={chapterId} onChange={(value) => { setChapterId(value); setTopicId(""); }}>
          <option value="">All chapters</option>
          {subject?.chapters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </FilterSelect>
        <FilterSelect label="Topic" value={topicId} onChange={setTopicId} disabled={!chapterId}>
          <option value="">All topics</option>
          {chapter?.topics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </FilterSelect>
        <FilterSelect label="Difficulty" value={difficulty} onChange={setDifficulty}>
          <option value="">Any</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
        </FilterSelect>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">PYQ year<input type="number" min="2013" max="2099" inputMode="numeric" value={examYear} onChange={(event) => setExamYear(event.target.value)} placeholder="Any" className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus-visible:outline-2 focus-visible:outline-green-600" /></label>
        <Button type="button" size="sm" className="self-end" onClick={applyFilters}>Apply</Button>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, disabled, children }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; children: ReactNode }) {
  return <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}<select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus-visible:outline-2 focus-visible:outline-green-600 disabled:bg-slate-100 disabled:text-slate-400">{children}</select></label>;
}
