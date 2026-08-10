import type { Difficulty, QuestionSource } from "@/generated/prisma/client";

export type AdminActionResult<T = undefined> =
  | { ok: true; message: string; data?: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

export type QuestionOptionInput = {
  label: "A" | "B" | "C" | "D";
  text: string;
  isCorrect: boolean;
};

export type QuestionInput = {
  subjectId: string;
  chapterId: string;
  topicId: string | null;
  questionText: string;
  explanation: string;
  difficulty: Difficulty;
  sourceType: QuestionSource;
  examYear: number | null;
  positiveMarks: number;
  negativeMarks: number;
  order: number;
  isPublished: boolean;
  options: QuestionOptionInput[];
};

export type HierarchyInput = {
  name: string;
  slug: string;
  description: string;
  order: number;
  parentId?: string;
};

export type AdminQuestionFilters = {
  search?: string;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  difficulty?: Difficulty;
  sourceType?: QuestionSource;
  publication?: "published" | "unpublished";
  examYear?: number;
  page: number;
  pageSize: number;
};

