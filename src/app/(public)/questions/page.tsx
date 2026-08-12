import type { Metadata } from "next";
import { QuestionFilters } from "@/components/questions/question-filters";
import { QuestionStudy } from "@/components/questions/question-study";
import { Container } from "@/components/ui/container";
import {
  listPracticeTaxonomy,
  listPublishedQuestions,
  parseDifficulty,
} from "@/server/questions/queries";
import { listPublicSubjects } from "@/server/subjects/queries";

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
  const [{ subjects, source }, taxonomy] = await Promise.all([
    listPublicSubjects(),
    listPracticeTaxonomy(),
  ]);
  const requestedSubject = firstValue(params.subject);
  const subjectSlug = subjects.some((subject) => subject.slug === requestedSubject)
    ? requestedSubject
    : subjects[0]?.slug;
  const selectedSubject = taxonomy.find((subject) => subject.slug === subjectSlug);
  const requestedChapter = firstValue(params.chapter);
  const chapterId = selectedSubject?.chapters.some((chapter) => chapter.id === requestedChapter)
    ? requestedChapter
    : undefined;
  const selectedChapter = selectedSubject?.chapters.find((chapter) => chapter.id === chapterId);
  const requestedTopic = firstValue(params.topic);
  const topicId = selectedChapter?.topics.some((topic) => topic.id === requestedTopic)
    ? requestedTopic
    : undefined;
  const difficulty = parseDifficulty(firstValue(params.difficulty));
  const requestedYear = Number(firstValue(params.year));
  const examYear = Number.isInteger(requestedYear)
    && requestedYear >= 2013
    && requestedYear <= new Date().getFullYear()
    ? requestedYear
    : undefined;
  const questions = subjectSlug
    ? await listPublishedQuestions({ subjectSlug, chapterId, topicId, difficulty, examYear })
    : [];

  return (
    <>
      <section className="border-b border-slate-300 bg-[#f4f7f6]">
        <Container className="reveal-up py-12 sm:py-16 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-end">
            <div>
              <p className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700"><span className="h-px w-10 bg-emerald-500" />Interactive syllabus</p>
              <h1 className="mt-6 max-w-4xl text-[clamp(3.1rem,7vw,6.6rem)] font-black leading-[0.88] tracking-[-0.07em] text-slate-950">Question<br />Bank</h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600">Move through the NEET syllabus as a connected hierarchy, then study each published question in a focused reading workspace.</p>
            </div>
            <div className="border-t border-slate-300 pt-5 lg:border-l lg:border-t-0 lg:pl-6">
              <p className="font-mono text-5xl font-bold tracking-[-0.06em] text-slate-950">{String(questions.length).padStart(2, "0")}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">questions in this view</p>
              <p className="mt-5 text-xs leading-5 text-slate-500">Answers and explanations stay hidden until you choose and check.</p>
            </div>
          </div>

          <div className="mt-12">
            <QuestionFilters key={`${subjectSlug}-${chapterId}-${topicId}-${difficulty ?? "all"}-${examYear ?? "all"}`} taxonomy={taxonomy} initial={{ subjectSlug, chapterId, topicId, difficulty, examYear }} resultCount={questions.length} />
          </div>
        </Container>
      </section>

      <section className="bg-[#f4f7f6]">
        <Container>
          {source === "fallback" && (
            <div className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              PostgreSQL is currently unavailable. Subject navigation remains visible, but questions require the database connection.
            </div>
          )}
          <QuestionStudy
            key={`${subjectSlug}-${chapterId}-${topicId}-${difficulty ?? "all"}-${examYear ?? "all"}`}
            questions={questions}
          />
        </Container>
      </section>
    </>
  );
}
