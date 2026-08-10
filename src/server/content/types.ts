export type ContentSubject = {
  id: string;
  name: string;
  description: string;
  order: number;
};

export type ContentChapter = {
  id: string;
  subjectId: string;
  slug: string;
  name: string;
  description: string;
  order: number;
};

export type ContentTopic = {
  id: string;
  chapterId: string;
  slug: string;
  name: string;
  description: string;
  order: number;
};

export type ContentQuestion = {
  id: string;
  legacyId?: string;
  subjectId: string;
  chapterId: string;
  topicId: string | null;
  questionText: string;
  explanation: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  sourceType: "ORIGINAL" | "PYQ" | "SAMPLE";
  examYear: number | null;
  positiveMarks: number;
  negativeMarks: number;
  order: number;
  isPublished: boolean;
  options: Array<{
    label: "A" | "B" | "C" | "D";
    text: string;
    isCorrect: boolean;
  }>;
};

export type ContentBundle = {
  subjects: ContentSubject[];
  chapters: ContentChapter[];
  topics: ContentTopic[];
  questions: ContentQuestion[];
};

export type ContentValidationError = {
  file: string;
  identifier: string;
  reason: string;
};

