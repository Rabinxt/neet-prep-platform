"use server";

import { getPrisma } from "@/server/db/client";
import { getExamDurationSeconds } from "@/lib/exam-config";
import {
  listExamQuestions,
  listPracticeQuestions,
  listPracticeTaxonomy,
  parseDifficulty,
  type ExamQuestionCount,
  type PracticeQuestionCount,
} from "@/server/questions/queries";
import {
  createPersistentAttempt,
  finalizeOwnedAttempt,
  findActiveAttempt,
} from "@/server/attempts/service";
import {
  attemptOwnerWhere,
  getCurrentAttemptOwner,
} from "@/server/attempts/ownership";

type ActionResult =
  | { status: "ok"; attemptId: string }
  | { status: "completed"; attemptId: string }
  | { status: "invalid"; message: string };

function isSafeIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 100;
}

function parseQuestionCount(value: unknown): PracticeQuestionCount | null {
  return value === "all" || value === 5 || value === 10 || value === 20
    ? value
    : null;
}

export async function startPracticeAttempt(input: {
  subjectId: string;
  chapterId?: string;
  topicId?: string;
  difficulty?: string;
  count: PracticeQuestionCount;
}): Promise<ActionResult> {
  const count = parseQuestionCount(input.count);
  if (!isSafeIdentifier(input.subjectId) || !count) {
    return { status: "invalid", message: "Choose a valid practice setup." };
  }

  try {
    const taxonomy = await listPracticeTaxonomy();
    const subject = taxonomy.find((item) => item.id === input.subjectId);
    const chapter = input.chapterId
      ? subject?.chapters.find((item) => item.id === input.chapterId)
      : undefined;
    const topic = input.topicId
      ? chapter?.topics.find((item) => item.id === input.topicId)
      : undefined;
    const difficulty = parseDifficulty(input.difficulty);
    if (
      !subject
      || Boolean(input.chapterId && !chapter)
      || Boolean(input.topicId && !topic)
      || Boolean(input.difficulty && !difficulty)
    ) {
      return { status: "invalid", message: "This practice setup is no longer available." };
    }

    const questions = await listPracticeQuestions({
      subjectId: subject.id,
      chapterId: chapter?.id,
      topicId: topic?.id,
      difficulty,
    }, count);
    if (questions.length === 0) {
      return { status: "invalid", message: "No published questions match this setup." };
    }

    const owner = await getCurrentAttemptOwner({ createAnonymous: true });
    if (!owner) throw new Error("An attempt owner could not be created.");
    const name = [subject.name, chapter?.name, topic?.name, difficulty?.toLowerCase()]
      .filter(Boolean)
      .join(" · ");
    const attempt = await createPersistentAttempt({
      owner,
      type: "PRACTICE",
      name: name || "Custom practice",
      questionIds: questions.map((question) => question.id),
      configuration: {
        subjectId: subject.id,
        chapterId: chapter?.id ?? null,
        topicId: topic?.id ?? null,
        difficulty: difficulty ?? null,
        count,
      },
    });
    return { status: "ok", attemptId: attempt.id };
  } catch {
    return { status: "invalid", message: "Practice could not be started. Please try again." };
  }
}

const examTypes = {
  mixed: { name: "Full Mixed Development Test", subjectSlug: undefined },
  physics: { name: "Physics Development Test", subjectSlug: "physics" },
  chemistry: { name: "Chemistry Development Test", subjectSlug: "chemistry" },
  biology: { name: "Biology Development Test", subjectSlug: "biology" },
} as const;

export async function startExamAttempt(input: {
  examType: keyof typeof examTypes;
  count: ExamQuestionCount;
}): Promise<ActionResult> {
  const count = parseQuestionCount(input.count);
  const configuration = examTypes[input.examType];
  if (!configuration || !count) {
    return { status: "invalid", message: "Choose a valid mock-test setup." };
  }

  try {
    const owner = await getCurrentAttemptOwner({ createAnonymous: true });
    if (!owner) throw new Error("An attempt owner could not be created.");
    const active = await findActiveAttempt(owner, "MOCK_EXAM");
    if (active?.expiresAt && new Date(active.expiresAt).getTime() <= Date.now()) {
      await finalizeOwnedAttempt(owner, active.id, "EXPIRED", "MOCK_EXAM");
    }
    const questions = await listExamQuestions({
      subjectSlug: configuration.subjectSlug,
      count,
    });
    if (questions.length === 0) {
      return { status: "invalid", message: "No published questions match this test." };
    }
    const attempt = await createPersistentAttempt({
      owner,
      type: "MOCK_EXAM",
      name: configuration.name,
      questionIds: questions.map((question) => question.id),
      configuration: { examType: input.examType, count },
      durationSeconds: getExamDurationSeconds(questions.length),
    });
    return { status: "ok", attemptId: attempt.id };
  } catch {
    return { status: "invalid", message: "The mock test could not be started. Please try again." };
  }
}

export async function savePracticeSelection(input: {
  attemptId: string;
  questionId: string;
  optionId: string | null;
  currentIndex: number;
}): Promise<ActionResult> {
  if (
    !isSafeIdentifier(input.attemptId)
    || !isSafeIdentifier(input.questionId)
    || (input.optionId !== null && !isSafeIdentifier(input.optionId))
    || !Number.isInteger(input.currentIndex)
  ) {
    return { status: "invalid", message: "The practice response is invalid." };
  }
  const owner = await getCurrentAttemptOwner({ createAnonymous: false });
  if (!owner) return { status: "invalid", message: "This practice session is unavailable." };

  try {
    const saved = await getPrisma().$transaction(async (tx) => {
      const question = await tx.attemptQuestion.findFirst({
        where: {
          id: input.questionId,
          attemptId: input.attemptId,
          attempt: { ...attemptOwnerWhere(owner), type: "PRACTICE", status: "IN_PROGRESS" },
        },
        select: {
          id: true,
          checkedAt: true,
          options: { select: { id: true } },
          attempt: { select: { totalQuestions: true } },
        },
      });
      if (!question || question.checkedAt) return false;
      if (input.optionId && !question.options.some((option) => option.id === input.optionId)) return false;
      const index = Math.min(Math.max(input.currentIndex, 0), question.attempt.totalQuestions - 1);
      await Promise.all([
        tx.attemptQuestion.update({
          where: { id: question.id },
          data: {
            selectedOptionId: input.optionId,
            responseStatus: input.optionId ? "ANSWERED" : "NOT_ANSWERED",
          },
        }),
        tx.attempt.update({
          where: { id: input.attemptId },
          data: { currentQuestionIndex: index },
        }),
      ]);
      return true;
    });
    return saved
      ? { status: "ok", attemptId: input.attemptId }
      : { status: "invalid", message: "This practice response could not be saved." };
  } catch {
    return { status: "invalid", message: "This practice response could not be saved." };
  }
}

export async function checkPracticeAnswer(input: {
  attemptId: string;
  questionId: string;
}): Promise<
  | { status: "checked"; isCorrect: boolean; correctOptionId: string; explanation: string | null }
  | { status: "invalid"; message: string }
> {
  if (!isSafeIdentifier(input.attemptId) || !isSafeIdentifier(input.questionId)) {
    return { status: "invalid", message: "The practice response is invalid." };
  }
  const owner = await getCurrentAttemptOwner({ createAnonymous: false });
  if (!owner) return { status: "invalid", message: "This practice session is unavailable." };

  try {
    return await getPrisma().$transaction(async (tx) => {
      const question = await tx.attemptQuestion.findFirst({
        where: {
          id: input.questionId,
          attemptId: input.attemptId,
          attempt: { ...attemptOwnerWhere(owner), type: "PRACTICE", status: "IN_PROGRESS" },
        },
        include: { options: true },
      });
      if (!question?.selectedOptionId) {
        return { status: "invalid" as const, message: "Select and save an answer before checking." };
      }
      const selected = question.options.find((option) => option.id === question.selectedOptionId);
      const correct = question.options.filter((option) => option.isCorrect);
      if (!selected || correct.length !== 1) {
        return { status: "invalid" as const, message: "This question snapshot is invalid." };
      }
      const isCorrect = selected.isCorrect;
      if (!question.checkedAt) {
        await tx.attemptQuestion.update({
          where: { id: question.id },
          data: {
            checkedAt: new Date(),
            isCorrect,
            marksAwarded: isCorrect ? question.positiveMarks : -question.negativeMarks,
          },
        });
      }
      return {
        status: "checked" as const,
        isCorrect,
        correctOptionId: correct[0].id,
        explanation: question.explanation,
      };
    });
  } catch {
    return { status: "invalid", message: "The answer could not be checked. Please try again." };
  }
}

export async function saveExamResponse(input: {
  attemptId: string;
  questionId: string;
  optionId: string | null;
  intent: "SAVE" | "REVIEW" | "CLEAR";
  nextIndex: number;
}): Promise<ActionResult> {
  if (
    !isSafeIdentifier(input.attemptId)
    || !isSafeIdentifier(input.questionId)
    || (input.optionId !== null && !isSafeIdentifier(input.optionId))
    || !["SAVE", "REVIEW", "CLEAR"].includes(input.intent)
    || !Number.isInteger(input.nextIndex)
  ) {
    return { status: "invalid", message: "The exam response is invalid." };
  }
  const owner = await getCurrentAttemptOwner({ createAnonymous: false });
  if (!owner) return { status: "invalid", message: "This exam session is unavailable." };

  try {
    const outcome = await getPrisma().$transaction(async (tx) => {
      const question = await tx.attemptQuestion.findFirst({
        where: {
          id: input.questionId,
          attemptId: input.attemptId,
          attempt: { ...attemptOwnerWhere(owner), type: "MOCK_EXAM", status: "IN_PROGRESS" },
        },
        select: {
          id: true,
          responseStatus: true,
          options: { select: { id: true } },
          attempt: { select: { expiresAt: true, totalQuestions: true } },
        },
      });
      if (!question) return "invalid" as const;
      if (question.attempt.expiresAt && question.attempt.expiresAt.getTime() <= Date.now()) {
        return "expired" as const;
      }
      if (input.optionId && !question.options.some((option) => option.id === input.optionId)) {
        return "invalid" as const;
      }
      const selectedOptionId = input.intent === "CLEAR" ? null : input.optionId;
      const responseStatus = input.intent === "REVIEW"
        ? selectedOptionId ? "ANSWERED_AND_MARKED_FOR_REVIEW" : "MARKED_FOR_REVIEW"
        : input.intent === "CLEAR"
          ? ["MARKED_FOR_REVIEW", "ANSWERED_AND_MARKED_FOR_REVIEW"].includes(question.responseStatus)
            ? "MARKED_FOR_REVIEW"
            : "NOT_ANSWERED"
          : selectedOptionId ? "ANSWERED" : "NOT_ANSWERED";
      const nextIndex = Math.min(Math.max(input.nextIndex, 0), question.attempt.totalQuestions - 1);
      const nextQuestionOrder = nextIndex + 1;
      await Promise.all([
        tx.attemptQuestion.update({
          where: { id: question.id },
          data: { selectedOptionId, responseStatus },
        }),
        tx.attemptQuestion.updateMany({
          where: {
            attemptId: input.attemptId,
            order: nextQuestionOrder,
            responseStatus: "NOT_VISITED",
          },
          data: { responseStatus: "NOT_ANSWERED" },
        }),
        tx.attempt.update({
          where: { id: input.attemptId },
          data: { currentQuestionIndex: nextIndex },
        }),
      ]);
      return "saved" as const;
    });
    if (outcome === "expired") {
      await finalizeOwnedAttempt(owner, input.attemptId, "EXPIRED", "MOCK_EXAM");
      return { status: "completed", attemptId: input.attemptId };
    }
    return outcome === "saved"
      ? { status: "ok", attemptId: input.attemptId }
      : { status: "invalid", message: "This exam response could not be saved." };
  } catch {
    return { status: "invalid", message: "This exam response could not be saved." };
  }
}

export async function setAttemptCurrentQuestion(input: {
  attemptId: string;
  type: "PRACTICE" | "MOCK_EXAM";
  currentIndex: number;
}): Promise<ActionResult> {
  if (!isSafeIdentifier(input.attemptId) || !Number.isInteger(input.currentIndex)) {
    return { status: "invalid", message: "The requested question is invalid." };
  }
  const owner = await getCurrentAttemptOwner({ createAnonymous: false });
  if (!owner) return { status: "invalid", message: "This attempt is unavailable." };
  try {
    const attempt = await getPrisma().attempt.findFirst({
      where: {
        id: input.attemptId,
        ...attemptOwnerWhere(owner),
        type: input.type,
        status: "IN_PROGRESS",
      },
      select: { expiresAt: true, totalQuestions: true },
    });
    if (!attempt) return { status: "invalid", message: "This attempt is unavailable." };
    if (input.type === "MOCK_EXAM" && attempt.expiresAt && attempt.expiresAt.getTime() <= Date.now()) {
      await finalizeOwnedAttempt(owner, input.attemptId, "EXPIRED", "MOCK_EXAM");
      return { status: "completed", attemptId: input.attemptId };
    }
    const currentIndex = Math.min(Math.max(input.currentIndex, 0), attempt.totalQuestions - 1);
    await getPrisma().$transaction([
      getPrisma().attempt.update({ where: { id: input.attemptId }, data: { currentQuestionIndex: currentIndex } }),
      getPrisma().attemptQuestion.updateMany({
        where: { attemptId: input.attemptId, order: currentIndex + 1, responseStatus: "NOT_VISITED" },
        data: { responseStatus: "NOT_ANSWERED" },
      }),
    ]);
    return { status: "ok", attemptId: input.attemptId };
  } catch {
    return { status: "invalid", message: "Progress could not be saved." };
  }
}

export async function finishAttempt(input: {
  attemptId: string;
  type: "PRACTICE" | "MOCK_EXAM";
}): Promise<ActionResult> {
  if (!isSafeIdentifier(input.attemptId)) {
    return { status: "invalid", message: "This attempt is invalid." };
  }
  const owner = await getCurrentAttemptOwner({ createAnonymous: false });
  if (!owner) return { status: "invalid", message: "This attempt is unavailable." };
  try {
    const finalized = await finalizeOwnedAttempt(
      owner,
      input.attemptId,
      "COMPLETED",
      input.type,
    );
    return finalized
      ? { status: "completed", attemptId: input.attemptId }
      : { status: "invalid", message: "This attempt is unavailable." };
  } catch {
    return { status: "invalid", message: "The attempt could not be submitted. Please try again." };
  }
}
