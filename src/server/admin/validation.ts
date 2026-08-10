import { Difficulty, QuestionSource } from "@/generated/prisma/client";
import type {
  HierarchyInput,
  QuestionInput,
  QuestionOptionInput,
} from "@/server/admin/types";

const identifierPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const optionLabels = ["A", "B", "C", "D"] as const;

export class AdminValidationError extends Error {
  constructor(
    message: string,
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "AdminValidationError";
  }
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength + 1) : "";
}

function integer(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : Number.NaN;
}

export function validateQuestionInput(value: unknown): QuestionInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AdminValidationError("Question details are invalid.");
  }
  const input = value as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const subjectId = text(input.subjectId, 100);
  const chapterId = text(input.chapterId, 100);
  const topicId = input.topicId === null || input.topicId === ""
    ? null
    : text(input.topicId, 100);
  const questionText = text(input.questionText, 5_000);
  const explanation = text(input.explanation, 10_000);
  const difficulty = input.difficulty;
  const sourceType = input.sourceType;
  const examYear = input.examYear === null || input.examYear === ""
    ? null
    : integer(input.examYear);
  const positiveMarks = integer(input.positiveMarks);
  const negativeMarks = integer(input.negativeMarks);
  const order = integer(input.order);

  if (!subjectId) errors.subjectId = "Choose a subject.";
  if (!chapterId) errors.chapterId = "Choose a chapter.";
  if (input.topicId !== null && input.topicId !== "" && !topicId) errors.topicId = "Choose a valid topic.";
  if (!questionText) errors.questionText = "Question text is required.";
  else if (questionText.length > 5_000) errors.questionText = "Question text is too long.";
  if (!explanation) errors.explanation = "A clear explanation is required.";
  else if (explanation.length > 10_000) errors.explanation = "Explanation is too long.";
  if (!Object.values(Difficulty).includes(difficulty as Difficulty)) errors.difficulty = "Choose a valid difficulty.";
  if (!Object.values(QuestionSource).includes(sourceType as QuestionSource)) errors.sourceType = "Choose a valid source.";
  if (!Number.isInteger(positiveMarks) || positiveMarks <= 0 || positiveMarks > 20) {
    errors.positiveMarks = "Positive marks must be an integer from 1 to 20.";
  }
  if (!Number.isInteger(negativeMarks) || negativeMarks < 0 || negativeMarks > 20) {
    errors.negativeMarks = "Negative marks must be an integer from 0 to 20.";
  } else if (Number.isInteger(positiveMarks) && negativeMarks > positiveMarks) {
    errors.negativeMarks = "Negative marks cannot exceed positive marks.";
  }
  if (!Number.isInteger(order) || order < 0 || order > 1_000_000) {
    errors.order = "Order must be a non-negative integer.";
  }
  if (typeof input.isPublished !== "boolean") errors.isPublished = "Publication status is invalid.";

  const currentYear = new Date().getFullYear();
  if (sourceType === QuestionSource.PYQ) {
    if (!Number.isInteger(examYear) || (examYear ?? 0) < 2013 || (examYear ?? 0) > currentYear) {
      errors.examYear = `Verified PYQs require an exam year from 2013 to ${currentYear}.`;
    }
  } else if (examYear !== null) {
    errors.examYear = "SAMPLE and ORIGINAL questions must not have an exam year.";
  }

  const rawOptions = Array.isArray(input.options) ? input.options : [];
  if (rawOptions.length !== 4) errors.options = "Exactly four options are required.";
  const options: QuestionOptionInput[] = rawOptions.map((raw, index) => {
    const option = raw && typeof raw === "object" && !Array.isArray(raw)
      ? raw as Record<string, unknown>
      : {};
    return {
      label: optionLabels[index] ?? "A",
      text: text(option.text, 1_000),
      isCorrect: option.isCorrect === true,
    };
  });
  if (options.some((option) => !option.text)) errors.options = "Every option needs text.";
  if (options.some((option) => option.text.length > 1_000)) errors.options = "Option text is too long.";
  if (options.filter((option) => option.isCorrect).length !== 1) {
    errors.correctOption = "Choose exactly one correct option.";
  }

  if (Object.keys(errors).length > 0) {
    throw new AdminValidationError("Review the highlighted question fields.", errors);
  }

  return {
    subjectId,
    chapterId,
    topicId,
    questionText,
    explanation,
    difficulty: difficulty as Difficulty,
    sourceType: sourceType as QuestionSource,
    examYear,
    positiveMarks,
    negativeMarks,
    order,
    isPublished: input.isPublished === true,
    options,
  };
}

export function validateHierarchyInput(value: unknown, type: "subject" | "chapter" | "topic"): HierarchyInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AdminValidationError("Hierarchy details are invalid.");
  }
  const input = value as Record<string, unknown>;
  const name = text(input.name, 120);
  const slug = text(input.slug, 120).toLowerCase();
  const description = text(input.description, 500);
  const order = integer(input.order);
  const parentId = text(input.parentId, 100);
  const errors: Record<string, string> = {};

  if (!name) errors.name = "Name is required.";
  else if (name.length > 120) errors.name = "Name is too long.";
  if (!slug || !identifierPattern.test(slug)) errors.slug = "Use lowercase kebab-case for the slug.";
  if (description.length > 500) errors.description = "Description is too long.";
  if (!Number.isInteger(order) || order < 0 || order > 10_000) errors.order = "Order must be from 0 to 10,000.";
  if (type !== "subject" && !parentId) errors.parentId = type === "chapter" ? "Choose a subject." : "Choose a chapter.";

  if (Object.keys(errors).length > 0) {
    throw new AdminValidationError(`Review the ${type} fields.`, errors);
  }
  return { name, slug, description, order, parentId: parentId || undefined };
}

export function parseAdminIds(value: unknown, maximum = 100) {
  if (!Array.isArray(value) || value.length === 0 || value.length > maximum) {
    throw new AdminValidationError(`Choose between 1 and ${maximum} items.`);
  }
  const ids = [...new Set(value.filter((item): item is string => (
    typeof item === "string" && item.length > 0 && item.length <= 100
  )))];
  if (ids.length !== value.length) throw new AdminValidationError("One or more selected items are invalid.");
  return ids;
}
