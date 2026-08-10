import type { Metadata } from "next";
import { QuestionFilters } from "@/components/questions/question-filters";
import { QuestionStudy } from "@/components/questions/question-study";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { PageHeading } from "@/components/ui/page-heading";
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
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="study-grid absolute inset-0" />
        <div className="absolute right-0 top-0 size-80 rounded-full bg-emerald-100/60 blur-3xl" />
        <Container className="reveal-up relative py-12 sm:py-16">
          <PageHeading
            eyebrow="Question bank"
            title="Study one question at a time"
            description="Filter the published question bank, test your understanding, and reveal each explanation only after checking your answer."
            actions={<Badge tone="green">{questions.length} question{questions.length === 1 ? "" : "s"}</Badge>}
          />
          <div className="mt-8">
            <QuestionFilters
              taxonomy={taxonomy}
              initial={{ subjectSlug, chapterId, topicId, difficulty, examYear }}
            />
          </div>
        </Container>
      </section>

      <section className="py-8 sm:py-14">
        <Container>
          {source === "fallback" && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
