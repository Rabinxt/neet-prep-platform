"use server";

import { getPrisma } from "@/server/db/client";

export type AnswerCheckResult =
  | {
      status: "checked";
      isCorrect: boolean;
      correctOptionId: string;
      explanation: string | null;
    }
  | { status: "invalid"; message: string };

function isSafeIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 100;
}

export async function checkQuestionAnswer(input: {
  questionId: string;
  optionId: string;
}): Promise<AnswerCheckResult> {
  if (!isSafeIdentifier(input.questionId) || !isSafeIdentifier(input.optionId)) {
    return { status: "invalid", message: "The selected answer is invalid." };
  }

  try {
    const selectedOption = await getPrisma().questionOption.findFirst({
      where: {
        id: input.optionId,
        questionId: input.questionId,
        question: { isPublished: true },
      },
      select: {
        isCorrect: true,
        question: {
          select: {
            explanation: true,
            options: {
              where: { isCorrect: true },
              take: 2,
              select: { id: true },
            },
          },
        },
      },
    });

    if (!selectedOption || selectedOption.question.options.length !== 1) {
      return { status: "invalid", message: "This question is not available for checking." };
    }

    return {
      status: "checked",
      isCorrect: selectedOption.isCorrect,
      correctOptionId: selectedOption.question.options[0].id,
      explanation: selectedOption.question.explanation,
    };
  } catch {
    return { status: "invalid", message: "The answer could not be checked. Please try again." };
  }
}
