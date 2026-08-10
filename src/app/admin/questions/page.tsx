import type { Metadata } from "next";
import Link from "next/link";
import { Difficulty, QuestionSource } from "@/generated/prisma/client";
import { AdminQuestionList } from "@/components/admin/question-list";
import { ButtonLink } from "@/components/ui/button";
import { getAdminTaxonomy, listAdminQuestions } from "@/server/admin/questions";
import { requireAdmin } from "@/server/auth/session";

export const metadata: Metadata = { title: "Questions | Admin" };
const control = "h-10 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function AdminQuestionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const query = await searchParams;
  const subjectId = one(query.subjectId);
  const chapterId = one(query.chapterId);
  const topicId = one(query.topicId);
  const taxonomy = await getAdminTaxonomy();
  const subject = taxonomy.find((item) => item.id === subjectId);
  const chapters = subject?.chapters ?? taxonomy.flatMap((item) => item.chapters);
  const chapter = chapters.find((item) => item.id === chapterId);
  const topics = chapter?.topics ?? taxonomy.flatMap((item) => item.chapters.flatMap((part) => part.topics));
  const difficultyValue = one(query.difficulty);
  const sourceValue = one(query.sourceType);
  const publication = one(query.publication);
  const examYearValue = Number(one(query.examYear));
  const result = await listAdminQuestions({
    search: one(query.search)?.trim().slice(0, 200) || undefined,
    subjectId: subjectId || undefined,
    chapterId: chapterId || undefined,
    topicId: topicId || undefined,
    difficulty: Object.values(Difficulty).includes(difficultyValue as Difficulty) ? difficultyValue as Difficulty : undefined,
    sourceType: Object.values(QuestionSource).includes(sourceValue as QuestionSource) ? sourceValue as QuestionSource : undefined,
    publication: publication === "published" || publication === "unpublished" ? publication : undefined,
    examYear: Number.isInteger(examYearValue) && examYearValue > 0 ? examYearValue : undefined,
    page: Math.max(Number(one(query.page)) || 1, 1),
    pageSize: 20,
  });
  const pageUrl = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) { const item = one(value); if (item && key !== "page") params.set(key, item); }
    params.set("page", String(page));
    return `/admin/questions?${params}`;
  };
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">Content library</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Questions</h1><p className="mt-1 text-sm text-slate-600">{result.total} live question{result.total === 1 ? "" : "s"} match this view.</p></div><ButtonLink href="/admin/questions/new">Add question</ButtonLink></div>
    <form className="border border-slate-200 bg-white p-4 shadow-sm" method="get">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(12rem,2fr)_repeat(6,minmax(8rem,1fr))_auto]">
        <input aria-label="Search questions" name="search" defaultValue={one(query.search)} placeholder="Search question or explanation…" className={control} />
        <select aria-label="Filter by subject" name="subjectId" defaultValue={subjectId} className={control}><option value="">All subjects</option>{taxonomy.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select aria-label="Filter by chapter" name="chapterId" defaultValue={chapterId} className={control}><option value="">All chapters</option>{chapters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select aria-label="Filter by topic" name="topicId" defaultValue={topicId} className={control}><option value="">All topics</option>{topics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select aria-label="Filter by difficulty" name="difficulty" defaultValue={difficultyValue} className={control}><option value="">Any difficulty</option>{Object.values(Difficulty).map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select aria-label="Filter by source" name="sourceType" defaultValue={sourceValue} className={control}><option value="">Any source</option>{Object.values(QuestionSource).map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select aria-label="Filter by publication" name="publication" defaultValue={publication} className={control}><option value="">Any status</option><option value="published">Published</option><option value="unpublished">Unpublished</option></select>
        <input aria-label="Filter by exam year" name="examYear" type="number" min={2013} max={new Date().getFullYear()} defaultValue={one(query.examYear)} placeholder="Year" className={control} />
        <button className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white hover:bg-emerald-800">Filter</button>
      </div>
      <div className="mt-3"><Link href="/admin/questions" className="text-xs font-bold text-slate-500 hover:text-slate-950">Clear all filters</Link></div>
    </form>
    <AdminQuestionList questions={result.questions.map((item) => ({ ...item, updatedAt: item.updatedAt.toISOString() }))} />
    <nav className="flex items-center justify-between gap-4" aria-label="Question pagination">
      {result.page > 1 ? <Link href={pageUrl(result.page - 1)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold hover:bg-slate-50">← Previous</Link> : <span />}
      <span className="text-sm font-semibold text-slate-500">Page {result.page} of {result.pageCount}</span>
      {result.page < result.pageCount ? <Link href={pageUrl(result.page + 1)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold hover:bg-slate-50">Next →</Link> : <span />}
    </nav>
  </div>;
}
