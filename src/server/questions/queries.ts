import { Difficulty } from "@/generated/prisma/enums";
import { getPrisma } from "@/server/db/client";
import { hasDatabaseUrl } from "@/server/db/env";

export type PublicQuestion = {
  id: string;
  questionText: string;
  difficulty: Difficulty;
  sourceType: "ORIGINAL" | "PYQ" | "SAMPLE";
  examYear: number | null;
  positiveMarks: number;
  negativeMarks: number;
  subject: { id: string; name: string; slug: string };
  chapter: { id: string; name: string; slug: string };
  topic: { id: string; name: string; slug: string } | null;
  options: Array<{
    id: string;
    optionText: string;
    optionLabel: string;
    order: number;
  }>;
};

export type PublishedQuestionFilters = {
  subjectId?: string;
  subjectSlug?: string;
  chapterId?: string;
  topicId?: string;
  difficulty?: Difficulty;
  examYear?: number;
  limit?: number | null;
};

export type PracticeQuestionCount = 5 | 10 | 20 | "all";
export type ExamQuestionCount = 5 | 10 | 20 | "all";

export type PracticeTaxonomy = Array<{
  id: string;
  name: string;
  slug: string;
  chapters: Array<{
    id: string;
    name: string;
    slug: string;
    topics: Array<{ id: string; name: string; slug: string }>;
  }>;
}>;

export function parseDifficulty(value: string | undefined): Difficulty | undefined {
  return Object.values(Difficulty).find((difficulty) => difficulty === value);
}

export async function listPublishedQuestions(
  filters: PublishedQuestionFilters = {},
): Promise<PublicQuestion[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  const take = filters.limit === null
    ? undefined
    : Math.min(Math.max(filters.limit ?? 100, 1), 100);

  try {
    const questions = await getPrisma().question.findMany({
      where: {
        isPublished: true,
        subjectId: filters.subjectId,
        subject: filters.subjectSlug ? { slug: filters.subjectSlug } : undefined,
        chapterId: filters.chapterId,
        topicId: filters.topicId,
        difficulty: filters.difficulty,
        ...(filters.examYear
          ? { sourceType: "PYQ" as const, examYear: filters.examYear }
          : {}),
      },
      orderBy: [
        { subject: { order: "asc" } },
        { chapter: { order: "asc" } },
        { order: "asc" },
        { createdAt: "asc" },
      ],
      take,
      select: {
        id: true,
        questionText: true,
        difficulty: true,
        sourceType: true,
        examYear: true,
        positiveMarks: true,
        negativeMarks: true,
        subject: { select: { id: true, name: true, slug: true } },
        chapter: { select: { id: true, name: true, slug: true } },
        topic: { select: { id: true, name: true, slug: true } },
        options: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            optionText: true,
            optionLabel: true,
            order: true,
          },
        },
      },
    });

    // Incomplete question drafts should never reach the student interface even
    // if they were published accidentally.
    return questions.filter((question) => question.options.length === 4);
  } catch {
    console.error("Unable to load published questions from PostgreSQL.");
    return [];
  }
}

export function listPracticeQuestions(
  filters: Omit<PublishedQuestionFilters, "limit">,
  count: PracticeQuestionCount,
) {
  return listPublishedQuestions({
    ...filters,
    limit: count === "all" ? null : count,
  });
}

export async function listExamQuestions({
  subjectSlug,
  count,
}: {
  subjectSlug?: string;
  count: ExamQuestionCount;
}) {
  const available = await listPublishedQuestions({
    subjectSlug,
    limit: null,
  });

  if (count === "all" || available.length <= count) {
    return available;
  }

  if (subjectSlug) {
    return available.slice(0, count);
  }

  const bySubject = new Map<string, PublicQuestion[]>();
  for (const question of available) {
    const group = bySubject.get(question.subject.slug) ?? [];
    group.push(question);
    bySubject.set(question.subject.slug, group);
  }

  const groups = [...bySubject.values()];
  const selected: PublicQuestion[] = [];
  let round = 0;

  while (selected.length < count) {
    let addedThisRound = false;
    for (const group of groups) {
      const question = group[round];
      if (question && selected.length < count) {
        selected.push(question);
        addedThisRound = true;
      }
    }
    if (!addedThisRound) break;
    round += 1;
  }

  return selected;
}

export async function listPracticeTaxonomy(): Promise<PracticeTaxonomy> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  try {
    return await getPrisma().subject.findMany({
      where: { questions: { some: { isPublished: true } } },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        chapters: {
          where: { questions: { some: { isPublished: true } } },
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            topics: {
              where: { questions: { some: { isPublished: true } } },
              orderBy: { order: "asc" },
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });
  } catch {
    console.error("Unable to load the published practice taxonomy from PostgreSQL.");
    return [];
  }
}

export function listPublishedQuestionsBySubject(
  subjectId: string,
  filters: Omit<PublishedQuestionFilters, "subjectId" | "subjectSlug"> = {},
) {
  return listPublishedQuestions({ ...filters, subjectId });
}

export function listPublishedQuestionsByChapter(
  chapterId: string,
  filters: Omit<PublishedQuestionFilters, "chapterId"> = {},
) {
  return listPublishedQuestions({ ...filters, chapterId });
}

export function listPublishedQuestionsByTopic(
  topicId: string,
  filters: Omit<PublishedQuestionFilters, "topicId"> = {},
) {
  return listPublishedQuestions({ ...filters, topicId });
}
