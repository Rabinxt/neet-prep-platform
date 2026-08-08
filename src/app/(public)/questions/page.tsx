import type { Metadata } from "next";
import { QuestionStudy } from "@/components/questions/question-study";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { listPublicSubjects } from "@/server/subjects/queries";
import { listPublishedQuestions, parseDifficulty } from "@/server/questions/queries";

export const metadata: Metadata = {
  title: "Question Bank",
  description: "Study published NEET preparation questions by subject and difficulty.",
};

export const revalidate = 300;

type QuestionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function QuestionsPage({ searchParams }: QuestionsPageProps) {
  const params = await searchParams;
  const { subjects, source } = await listPublicSubjects();
  const requestedSubject = firstValue(params.subject);
  const subjectSlug = subjects.some((subject) => subject.slug === requestedSubject)
    ? requestedSubject
    : subjects[0]?.slug;
  const difficulty = parseDifficulty(firstValue(params.difficulty));
  const questions = subjectSlug
    ? await listPublishedQuestions({ subjectSlug, difficulty })
    : [];

  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <Container className="py-10 sm:py-12">
          <p className="text-sm font-bold uppercase tracking-wider text-green-700">Question bank</p>
          <div className="mt-3 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Study one question at a time</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">Choose a subject, test your understanding, and review the explanation. This is untimed study—not an exam.</p>
            </div>
            <form className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[180px_160px_auto]" method="get">
              <label className="text-xs font-semibold text-slate-600">
                Subject
                <select name="subject" defaultValue={subjectSlug} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2">
                  {subjects.map((subject) => <option key={subject.id} value={subject.slug}>{subject.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Difficulty
                <select name="difficulty" defaultValue={difficulty ?? ""} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2">
                  <option value="">All levels</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </label>
              <Button type="submit" size="sm" className="self-end">Apply filters</Button>
            </form>
          </div>
        </Container>
      </section>

      <section className="py-8 sm:py-10">
        <Container>
          {source === "fallback" && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              PostgreSQL is currently unavailable. Subject navigation remains visible, but questions require the database connection.
            </div>
          )}
          <QuestionStudy key={`${subjectSlug}-${difficulty ?? "all"}`} questions={questions} />
        </Container>
      </section>
    </>
  );
}
