export type AttemptQuestionStatusValue =
  | "NOT_VISITED"
  | "NOT_ANSWERED"
  | "ANSWERED"
  | "MARKED_FOR_REVIEW"
  | "ANSWERED_AND_MARKED_FOR_REVIEW";

export type AttemptOptionData = {
  id: string;
  optionLabel: string;
  optionText: string;
  order: number;
};

export type ActiveAttemptQuestion = {
  id: string;
  questionText: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  sourceType: "ORIGINAL" | "PYQ" | "SAMPLE";
  examYear: number | null;
  positiveMarks: number;
  negativeMarks: number;
  subject: { name: string; slug: string };
  chapter: { name: string; slug: string };
  topic: { name: string; slug: string } | null;
  options: AttemptOptionData[];
  selectedOptionId: string | null;
  responseStatus: AttemptQuestionStatusValue;
  checkedResult?: {
    isCorrect: boolean;
    correctOptionId: string;
    explanation: string | null;
  };
};

export type ActiveAttemptData = {
  id: string;
  type: "PRACTICE" | "MOCK_EXAM";
  status: "IN_PROGRESS";
  name: string;
  startedAt: string;
  serverNow: string;
  expiresAt: string | null;
  currentQuestionIndex: number;
  questions: ActiveAttemptQuestion[];
};

export type AttemptSubjectResult = {
  name: string;
  slug: string;
  attempted: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  score: number;
  maximumMarks: number;
};

export type AttemptReviewItem = {
  questionId: string;
  questionText: string;
  explanation: string | null;
  selectedOptionId: string | null;
  correctOptionId: string;
  outcome: "CORRECT" | "INCORRECT" | "UNANSWERED";
  marksAwarded: number;
  positiveMarks: number;
  negativeMarks: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  sourceType: "ORIGINAL" | "PYQ" | "SAMPLE";
  examYear: number | null;
  subject: { name: string; slug: string };
  chapter: { name: string; slug: string };
  topic: { name: string; slug: string } | null;
  options: AttemptOptionData[];
};

export type CompletedAttemptData = {
  id: string;
  type: "PRACTICE" | "MOCK_EXAM";
  status: "COMPLETED" | "EXPIRED";
  name: string;
  startedAt: string;
  completedAt: string;
  overall: {
    total: number;
    attempted: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    score: number;
    maximumMarks: number;
    accuracy: number;
  };
  subjects: AttemptSubjectResult[];
  review: AttemptReviewItem[];
};

export type AttemptPageData = ActiveAttemptData | CompletedAttemptData;

export type ActiveAttemptSummary = {
  id: string;
  name: string;
  type: "PRACTICE" | "MOCK_EXAM";
  startedAt: string;
  expiresAt: string | null;
  totalQuestions: number;
  currentQuestionIndex: number;
};
