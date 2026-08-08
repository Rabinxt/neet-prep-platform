import { AttemptStatus, AttemptType, Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/client";
import { calculateAttemptScore, type SubjectScore } from "@/server/attempts/scoring";
import type {
  ActiveAttemptSummary,
  AttemptPageData,
  AttemptReviewItem,
  CompletedAttemptData,
} from "@/server/attempts/types";

const attemptInclude = {
  questions: {
    orderBy: { order: "asc" as const },
    include: {
      options: { orderBy: { order: "asc" as const } },
      selectedOption: { select: { id: true, isCorrect: true } },
    },
  },
} satisfies Prisma.AttemptInclude;

type AttemptWithQuestions = Prisma.AttemptGetPayload<{ include: typeof attemptInclude }>;

export async function createPersistentAttempt(input: {
  anonymousSessionId: string;
  type: "PRACTICE" | "MOCK_EXAM";
  name: string;
  questionIds: string[];
  configuration: Prisma.InputJsonValue;
  durationSeconds?: number;
}) {
  const prisma = getPrisma();
  const sourceQuestions = await prisma.question.findMany({
    where: { id: { in: input.questionIds }, isPublished: true },
    select: {
      id: true,
      questionText: true,
      explanation: true,
      difficulty: true,
      sourceType: true,
      examYear: true,
      positiveMarks: true,
      negativeMarks: true,
      subject: { select: { name: true, slug: true, order: true } },
      chapter: { select: { name: true, slug: true } },
      topic: { select: { name: true, slug: true } },
      options: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          optionText: true,
          optionLabel: true,
          order: true,
          isCorrect: true,
        },
      },
    },
  });
  const sourceMap = new Map(sourceQuestions.map((question) => [question.id, question]));
  const orderedQuestions = input.questionIds.map((id) => sourceMap.get(id));
  if (
    orderedQuestions.some((question) => !question)
    || orderedQuestions.some(
      (question) => question?.options.length !== 4
        || question.options.filter((option) => option.isCorrect).length !== 1,
    )
  ) {
    throw new Error("The selected questions are no longer available.");
  }

  const now = new Date();
  const expiresAt = input.durationSeconds
    ? new Date(now.getTime() + input.durationSeconds * 1_000)
    : null;
  const maximumMarks = orderedQuestions.reduce(
    (total, question) => total + (question?.positiveMarks ?? 0),
    0,
  );

  return prisma.$transaction(async (tx) => {
    await tx.attempt.updateMany({
      where: {
        anonymousSessionId: input.anonymousSessionId,
        type: input.type,
        status: "IN_PROGRESS",
      },
      data: { status: "ABANDONED", completedAt: now },
    });

    return tx.attempt.create({
      data: {
        anonymousSessionId: input.anonymousSessionId,
        type: input.type,
        name: input.name,
        configuration: input.configuration,
        startedAt: now,
        expiresAt,
        totalQuestions: orderedQuestions.length,
        unanswered: orderedQuestions.length,
        maximumMarks,
        questions: {
          create: orderedQuestions.map((question, index) => ({
            sourceQuestionId: question!.id,
            order: index + 1,
            questionText: question!.questionText,
            explanation: question!.explanation,
            difficulty: question!.difficulty,
            sourceType: question!.sourceType,
            examYear: question!.examYear,
            positiveMarks: question!.positiveMarks,
            negativeMarks: question!.negativeMarks,
            subjectName: question!.subject.name,
            subjectSlug: question!.subject.slug,
            subjectOrder: question!.subject.order,
            chapterName: question!.chapter.name,
            chapterSlug: question!.chapter.slug,
            topicName: question!.topic?.name,
            topicSlug: question!.topic?.slug,
            responseStatus: index === 0 ? "NOT_ANSWERED" : "NOT_VISITED",
            options: {
              create: question!.options.map((option) => ({
                sourceOptionId: option.id,
                optionText: option.optionText,
                optionLabel: option.optionLabel,
                order: option.order,
                isCorrect: option.isCorrect,
              })),
            },
          })),
        },
      },
      select: { id: true },
    });
  }, { timeout: 30_000 });
}

export async function findActiveAttempt(
  anonymousSessionId: string | null,
  type: "PRACTICE" | "MOCK_EXAM",
): Promise<ActiveAttemptSummary | null> {
  if (!anonymousSessionId) return null;
  let attempt;
  try {
    attempt = await getPrisma().attempt.findFirst({
      where: { anonymousSessionId, type, status: "IN_PROGRESS" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        startedAt: true,
        expiresAt: true,
        totalQuestions: true,
        currentQuestionIndex: true,
      },
    });
  } catch {
    return null;
  }
  if (!attempt) return null;
  return {
    ...attempt,
    startedAt: attempt.startedAt.toISOString(),
    expiresAt: attempt.expiresAt?.toISOString() ?? null,
  };
}

async function readOwnedAttempt(
  anonymousSessionId: string,
  attemptId: string,
): Promise<AttemptWithQuestions | null> {
  return getPrisma().attempt.findFirst({
    where: { id: attemptId, anonymousSessionId },
    include: attemptInclude,
  });
}

function parseSubjectBreakdown(value: Prisma.JsonValue | null): SubjectScore[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SubjectScore => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const subject = item as Record<string, unknown>;
    return typeof subject.name === "string"
      && typeof subject.slug === "string"
      && ["attempted", "correct", "incorrect", "unanswered", "score", "maximumMarks"]
        .every((key) => typeof subject[key] === "number");
  });
}

function toCompletedAttempt(attempt: AttemptWithQuestions): CompletedAttemptData {
  const review: AttemptReviewItem[] = attempt.questions.map((question) => {
    const correctOption = question.options.find((option) => option.isCorrect);
    const outcome = question.isCorrect === true
      ? "CORRECT" as const
      : question.isCorrect === false
        ? "INCORRECT" as const
        : "UNANSWERED" as const;
    return {
      questionId: question.id,
      questionText: question.questionText,
      explanation: question.explanation,
      selectedOptionId: question.selectedOptionId,
      correctOptionId: correctOption?.id ?? "",
      outcome,
      marksAwarded: question.marksAwarded ?? 0,
      positiveMarks: question.positiveMarks,
      negativeMarks: question.negativeMarks,
      difficulty: question.difficulty,
      sourceType: question.sourceType,
      examYear: question.examYear,
      subject: { name: question.subjectName, slug: question.subjectSlug },
      chapter: { name: question.chapterName, slug: question.chapterSlug },
      topic: question.topicName && question.topicSlug
        ? { name: question.topicName, slug: question.topicSlug }
        : null,
      options: question.options.map(({ id, optionLabel, optionText, order }) => ({
        id,
        optionLabel,
        optionText,
        order,
      })),
    };
  });

  return {
    id: attempt.id,
    type: attempt.type,
    status: attempt.status as "COMPLETED" | "EXPIRED",
    name: attempt.name,
    startedAt: attempt.startedAt.toISOString(),
    completedAt: (attempt.completedAt ?? attempt.updatedAt).toISOString(),
    overall: {
      total: attempt.totalQuestions,
      attempted: attempt.attemptedQuestions,
      correct: attempt.correct,
      incorrect: attempt.incorrect,
      unanswered: attempt.unanswered,
      score: attempt.score,
      maximumMarks: attempt.maximumMarks,
      accuracy: attempt.accuracy,
    },
    subjects: parseSubjectBreakdown(attempt.subjectBreakdown),
    review,
  };
}

function toActiveAttempt(attempt: AttemptWithQuestions): AttemptPageData {
  return {
    id: attempt.id,
    type: attempt.type,
    status: "IN_PROGRESS",
    name: attempt.name,
    startedAt: attempt.startedAt.toISOString(),
    serverNow: new Date().toISOString(),
    expiresAt: attempt.expiresAt?.toISOString() ?? null,
    currentQuestionIndex: Math.min(
      Math.max(attempt.currentQuestionIndex, 0),
      Math.max(attempt.questions.length - 1, 0),
    ),
    questions: attempt.questions.map((question) => {
      const checkedResult = attempt.type === "PRACTICE" && question.checkedAt
        ? {
            isCorrect: Boolean(question.isCorrect),
            correctOptionId: question.options.find((option) => option.isCorrect)?.id ?? "",
            explanation: question.explanation,
          }
        : undefined;
      return {
        id: question.id,
        questionText: question.questionText,
        difficulty: question.difficulty,
        sourceType: question.sourceType,
        examYear: question.examYear,
        positiveMarks: question.positiveMarks,
        negativeMarks: question.negativeMarks,
        subject: { name: question.subjectName, slug: question.subjectSlug },
        chapter: { name: question.chapterName, slug: question.chapterSlug },
        topic: question.topicName && question.topicSlug
          ? { name: question.topicName, slug: question.topicSlug }
          : null,
        options: question.options.map(({ id, optionLabel, optionText, order }) => ({
          id,
          optionLabel,
          optionText,
          order,
        })),
        selectedOptionId: question.selectedOptionId,
        responseStatus: question.responseStatus,
        checkedResult,
      };
    }),
  };
}

async function finalizeInTransaction(
  tx: Prisma.TransactionClient,
  attempt: AttemptWithQuestions,
  status: "COMPLETED" | "EXPIRED",
) {
  if (attempt.status !== "IN_PROGRESS") return;
  const result = calculateAttemptScore(
    attempt.type,
    attempt.questions.map((question) => ({
      id: question.id,
      positiveMarks: question.positiveMarks,
      negativeMarks: question.negativeMarks,
      subjectName: question.subjectName,
      subjectSlug: question.subjectSlug,
      subjectOrder: question.subjectOrder,
      selectedOptionId: question.selectedOptionId,
      selectedOptionIsCorrect: question.selectedOption?.isCorrect ?? null,
      checked: Boolean(question.checkedAt),
    })),
  );

  const grouped = new Map<string, { ids: string[]; isCorrect: boolean | null; marks: number }>();
  for (const question of result.questions) {
    const isCorrect = question.outcome === "UNANSWERED" ? null : question.outcome === "CORRECT";
    const key = `${String(isCorrect)}:${question.marksAwarded}`;
    const group = grouped.get(key) ?? { ids: [], isCorrect, marks: question.marksAwarded };
    group.ids.push(question.id);
    grouped.set(key, group);
  }
  await Promise.all([...grouped.values()].map((group) => tx.attemptQuestion.updateMany({
    where: { id: { in: group.ids }, attemptId: attempt.id },
    data: { isCorrect: group.isCorrect, marksAwarded: group.marks },
  })));

  await tx.attempt.updateMany({
    where: { id: attempt.id, status: "IN_PROGRESS" },
    data: {
      status,
      completedAt: new Date(),
      attemptedQuestions: result.attempted,
      correct: result.correct,
      incorrect: result.incorrect,
      unanswered: result.unanswered,
      score: result.score,
      maximumMarks: result.maximumMarks,
      accuracy: result.accuracy,
      subjectBreakdown: result.subjects,
    },
  });
}

export async function finalizeOwnedAttempt(
  anonymousSessionId: string,
  attemptId: string,
  requestedStatus: "COMPLETED" | "EXPIRED" = "COMPLETED",
  expectedType?: "PRACTICE" | "MOCK_EXAM",
) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.attempt.findFirst({
      where: { id: attemptId, anonymousSessionId, type: expectedType },
      include: attemptInclude,
    });
    if (!attempt || attempt.status === "ABANDONED") return false;
    if (attempt.status !== "IN_PROGRESS") return true;
    const expired = attempt.type === "MOCK_EXAM"
      && attempt.expiresAt
      && attempt.expiresAt.getTime() <= Date.now();
    await finalizeInTransaction(tx, attempt, expired ? "EXPIRED" : requestedStatus);
    return true;
  }, { timeout: 30_000 });
}

export async function loadOwnedAttempt(
  anonymousSessionId: string | null,
  attemptId: string,
): Promise<AttemptPageData | null> {
  if (!anonymousSessionId) return null;
  let attempt = await readOwnedAttempt(anonymousSessionId, attemptId);
  if (!attempt || attempt.status === AttemptStatus.ABANDONED) return null;

  if (
    attempt.status === AttemptStatus.IN_PROGRESS
    && attempt.type === AttemptType.MOCK_EXAM
    && attempt.expiresAt
    && attempt.expiresAt.getTime() <= Date.now()
  ) {
    await finalizeOwnedAttempt(anonymousSessionId, attempt.id, "EXPIRED", "MOCK_EXAM");
    attempt = await readOwnedAttempt(anonymousSessionId, attemptId);
    if (!attempt) return null;
  }

  return attempt.status === AttemptStatus.IN_PROGRESS
    ? toActiveAttempt(attempt)
    : toCompletedAttempt(attempt);
}

export async function getOwnedInProgressAttempt(
  tx: Prisma.TransactionClient,
  anonymousSessionId: string,
  attemptId: string,
  type: "PRACTICE" | "MOCK_EXAM",
) {
  return tx.attempt.findFirst({
    where: {
      id: attemptId,
      anonymousSessionId,
      type,
      status: "IN_PROGRESS",
    },
    select: {
      id: true,
      expiresAt: true,
      totalQuestions: true,
      questions: {
        select: { id: true, order: true },
        orderBy: { order: "asc" },
      },
    },
  });
}
