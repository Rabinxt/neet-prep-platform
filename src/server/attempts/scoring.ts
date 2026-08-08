export type ScoringAttemptType = "PRACTICE" | "MOCK_EXAM";

export type ScoringQuestion = {
  id: string;
  positiveMarks: number;
  negativeMarks: number;
  subjectName: string;
  subjectSlug: string;
  subjectOrder: number;
  selectedOptionId: string | null;
  selectedOptionIsCorrect: boolean | null;
  checked: boolean;
};

export type QuestionScore = {
  id: string;
  outcome: "CORRECT" | "INCORRECT" | "UNANSWERED";
  marksAwarded: number;
};

export type SubjectScore = {
  name: string;
  slug: string;
  attempted: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  score: number;
  maximumMarks: number;
};

export type AttemptScore = {
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  score: number;
  maximumMarks: number;
  accuracy: number;
  questions: QuestionScore[];
  subjects: SubjectScore[];
};

export function calculateAttemptScore(
  type: ScoringAttemptType,
  questions: ScoringQuestion[],
): AttemptScore {
  const subjects = new Map<string, SubjectScore & { order: number }>();
  const questionScores: QuestionScore[] = [];

  for (const question of questions) {
    const shouldEvaluate = type === "MOCK_EXAM"
      ? Boolean(question.selectedOptionId)
      : question.checked;
    const outcome = !shouldEvaluate
      ? "UNANSWERED" as const
      : question.selectedOptionIsCorrect
        ? "CORRECT" as const
        : "INCORRECT" as const;
    const marksAwarded = outcome === "CORRECT"
      ? question.positiveMarks
      : outcome === "INCORRECT"
        ? -question.negativeMarks
        : 0;

    questionScores.push({ id: question.id, outcome, marksAwarded });
    const subject = subjects.get(question.subjectSlug) ?? {
      name: question.subjectName,
      slug: question.subjectSlug,
      order: question.subjectOrder,
      attempted: 0,
      correct: 0,
      incorrect: 0,
      unanswered: 0,
      score: 0,
      maximumMarks: 0,
    };
    subject.maximumMarks += question.positiveMarks;
    subject.score += marksAwarded;
    if (outcome === "CORRECT") {
      subject.attempted += 1;
      subject.correct += 1;
    } else if (outcome === "INCORRECT") {
      subject.attempted += 1;
      subject.incorrect += 1;
    } else {
      subject.unanswered += 1;
    }
    subjects.set(subject.slug, subject);
  }

  const sortedSubjects = [...subjects.values()]
    .sort((left, right) => left.order - right.order)
    .map((subject) => ({
      name: subject.name,
      slug: subject.slug,
      attempted: subject.attempted,
      correct: subject.correct,
      incorrect: subject.incorrect,
      unanswered: subject.unanswered,
      score: subject.score,
      maximumMarks: subject.maximumMarks,
    }));
  const correct = sortedSubjects.reduce((total, subject) => total + subject.correct, 0);
  const incorrect = sortedSubjects.reduce((total, subject) => total + subject.incorrect, 0);
  const attempted = correct + incorrect;

  return {
    total: questions.length,
    attempted,
    correct,
    incorrect,
    unanswered: questions.length - attempted,
    score: sortedSubjects.reduce((total, subject) => total + subject.score, 0),
    maximumMarks: sortedSubjects.reduce((total, subject) => total + subject.maximumMarks, 0),
    accuracy: attempted === 0 ? 0 : Math.round((correct / attempted) * 100),
    questions: questionScores,
    subjects: sortedSubjects,
  };
}
