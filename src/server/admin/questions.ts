import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/client";
import type { AdminQuestionFilters } from "@/server/admin/types";
import { AdminValidationError, parseAdminIds, validateQuestionInput } from "@/server/admin/validation";

const questionDetailSelect = {
  id: true,
  importId: true,
  subjectId: true,
  chapterId: true,
  topicId: true,
  questionText: true,
  explanation: true,
  difficulty: true,
  sourceType: true,
  examYear: true,
  positiveMarks: true,
  negativeMarks: true,
  order: true,
  isPublished: true,
  updatedAt: true,
  options: {
    orderBy: { order: "asc" as const },
    select: {
      id: true,
      optionLabel: true,
      optionText: true,
      order: true,
      isCorrect: true,
    },
  },
} satisfies Prisma.QuestionSelect;

export async function getAdminOverview() {
  const prisma = getPrisma();
  const [
    totalQuestions,
    publishedQuestions,
    subjects,
    chapters,
    topics,
    subjectCounts,
  ] = await Promise.all([
    prisma.question.count(),
    prisma.question.count({ where: { isPublished: true } }),
    prisma.subject.count(),
    prisma.chapter.count(),
    prisma.topic.count(),
    prisma.subject.findMany({
      orderBy: { order: "asc" },
      select: { id: true, name: true, slug: true, _count: { select: { questions: true } } },
    }),
  ]);
  return {
    totalQuestions,
    publishedQuestions,
    unpublishedQuestions: totalQuestions - publishedQuestions,
    subjects,
    chapters,
    topics,
    subjectCounts: subjectCounts.map((subject) => ({
      id: subject.id,
      name: subject.name,
      slug: subject.slug,
      questions: subject._count.questions,
    })),
  };
}

export async function getAdminTaxonomy() {
  return getPrisma().subject.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      chapters: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          subjectId: true,
          topics: {
            orderBy: { order: "asc" },
            select: { id: true, name: true, slug: true, chapterId: true },
          },
        },
      },
    },
  });
}

function buildQuestionWhere(filters: AdminQuestionFilters): Prisma.QuestionWhereInput {
  return {
    subjectId: filters.subjectId,
    chapterId: filters.chapterId,
    topicId: filters.topicId,
    difficulty: filters.difficulty,
    sourceType: filters.sourceType,
    examYear: filters.examYear,
    isPublished: filters.publication === "published"
      ? true
      : filters.publication === "unpublished"
        ? false
        : undefined,
    ...(filters.search ? {
      OR: [
        { questionText: { contains: filters.search, mode: "insensitive" } },
        { explanation: { contains: filters.search, mode: "insensitive" } },
      ],
    } : {}),
  };
}

export async function listAdminQuestions(filters: AdminQuestionFilters) {
  const prisma = getPrisma();
  const where = buildQuestionWhere(filters);
  const pageSize = Math.min(Math.max(filters.pageSize, 10), 50);
  const total = await prisma.question.count({ where });
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(Math.max(filters.page, 1), pageCount);
  const questions = await prisma.question.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      questionText: true,
      difficulty: true,
      sourceType: true,
      examYear: true,
      isPublished: true,
      updatedAt: true,
      subject: { select: { id: true, name: true } },
      chapter: { select: { id: true, name: true } },
      topic: { select: { id: true, name: true } },
    },
  });
  return { questions, total, page, pageSize, pageCount };
}

export function getAdminQuestion(id: string) {
  return getPrisma().question.findUnique({ where: { id }, select: questionDetailSelect });
}

async function assertHierarchy(
  tx: Prisma.TransactionClient,
  input: { subjectId: string; chapterId: string; topicId: string | null },
) {
  const chapter = await tx.chapter.findFirst({
    where: { id: input.chapterId, subjectId: input.subjectId },
    select: { id: true },
  });
  if (!chapter) {
    throw new AdminValidationError("The selected chapter does not belong to the selected subject.", {
      chapterId: "Choose a chapter from the selected subject.",
    });
  }
  if (input.topicId) {
    const topic = await tx.topic.findFirst({
      where: { id: input.topicId, chapterId: input.chapterId },
      select: { id: true },
    });
    if (!topic) {
      throw new AdminValidationError("The selected topic does not belong to the selected chapter.", {
        topicId: "Choose a topic from the selected chapter.",
      });
    }
  }
}

function optionCreates(options: ReturnType<typeof validateQuestionInput>["options"]) {
  return options.map((option, index) => ({
    optionLabel: option.label,
    optionText: option.text,
    order: index + 1,
    isCorrect: option.isCorrect,
  }));
}

export async function createAdminQuestion(rawInput: unknown) {
  const input = validateQuestionInput(rawInput);
  return getPrisma().$transaction(async (tx) => {
    await assertHierarchy(tx, input);
    return tx.question.create({
      data: {
        subjectId: input.subjectId,
        chapterId: input.chapterId,
        topicId: input.topicId,
        questionText: input.questionText,
        explanation: input.explanation,
        difficulty: input.difficulty,
        sourceType: input.sourceType,
        examYear: input.examYear,
        positiveMarks: input.positiveMarks,
        negativeMarks: input.negativeMarks,
        order: input.order,
        isPublished: input.isPublished,
        options: { create: optionCreates(input.options) },
      },
      select: { id: true },
    });
  }, { timeout: 30_000 });
}

export async function updateAdminQuestion(id: string, rawInput: unknown) {
  if (!id || id.length > 100) throw new AdminValidationError("Question identifier is invalid.");
  const input = validateQuestionInput(rawInput);
  return getPrisma().$transaction(async (tx) => {
    const existing = await tx.question.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new AdminValidationError("Question was not found.");
    await assertHierarchy(tx, input);
    return tx.question.update({
      where: { id },
      data: {
        subjectId: input.subjectId,
        chapterId: input.chapterId,
        topicId: input.topicId,
        questionText: input.questionText,
        explanation: input.explanation,
        difficulty: input.difficulty,
        sourceType: input.sourceType,
        examYear: input.examYear,
        positiveMarks: input.positiveMarks,
        negativeMarks: input.negativeMarks,
        order: input.order,
        isPublished: input.isPublished,
        options: { deleteMany: {}, create: optionCreates(input.options) },
      },
      select: { id: true },
    });
  }, { timeout: 30_000 });
}

export async function setAdminQuestionPublication(id: string, isPublished: boolean) {
  const ids = parseAdminIds([id], 1);
  const result = await getPrisma().question.updateMany({
    where: { id: ids[0] },
    data: { isPublished },
  });
  if (result.count !== 1) throw new AdminValidationError("Question was not found.");
  return result;
}

export async function bulkSetAdminQuestionPublication(rawIds: unknown, isPublished: boolean) {
  const ids = parseAdminIds(rawIds);
  return getPrisma().$transaction(async (tx) => {
    const count = await tx.question.count({ where: { id: { in: ids } } });
    if (count !== ids.length) throw new AdminValidationError("One or more questions no longer exist.");
    return tx.question.updateMany({ where: { id: { in: ids } }, data: { isPublished } });
  });
}

export async function deleteAdminQuestion(id: string) {
  const ids = parseAdminIds([id], 1);
  return getPrisma().$transaction(async (tx) => {
    const existing = await tx.question.findUnique({ where: { id: ids[0] }, select: { id: true } });
    if (!existing) throw new AdminValidationError("Question was not found.");
    // AttemptQuestion uses onDelete: SetNull and AttemptQuestionOption is an
    // independent snapshot, so this only removes the live question/options.
    return tx.question.delete({ where: { id: ids[0] }, select: { id: true } });
  });
}
