import type {
  AnalyticsAttemptType,
  ChapterPerformance,
  DashboardAnalytics,
  DashboardAnalyticsInput,
  ModePerformance,
  SnapshotQuestionRecord,
  SubjectPerformance,
} from "@/server/analytics/types";

export const MIN_CHAPTER_DISPLAY_QUESTIONS = 2;
export const MIN_FOCUS_AREA_QUESTIONS = 3;
export const FOCUS_AREA_ACCURACY_THRESHOLD = 60;
export const STRONG_AREA_ACCURACY_THRESHOLD = 75;

// Accuracy counts only finalized snapshot questions with a resolved outcome.
// Active, abandoned, skipped, and unchecked Practice questions are excluded.
// Session counts include both COMPLETED and server-expired EXPIRED attempts.
function accuracy(correct: number, attempted: number) {
  return attempted === 0 ? null : Math.round((correct / attempted) * 100);
}

function modePerformance(
  type: AnalyticsAttemptType,
  input: DashboardAnalyticsInput,
): ModePerformance {
  const attempts = input.terminalAttempts.filter((attempt) => attempt.type === type);
  const questions = input.questions.filter(
    (question) => question.attemptType === type && question.isCorrect !== null,
  );
  const correct = questions.filter((question) => question.isCorrect).length;
  const incorrect = questions.length - correct;
  return {
    type,
    sessions: attempts.length,
    attempted: questions.length,
    correct,
    incorrect,
    accuracy: accuracy(correct, questions.length),
    score: attempts.reduce((total, attempt) => total + attempt.score, 0),
    maximumMarks: attempts.reduce((total, attempt) => total + attempt.maximumMarks, 0),
  };
}

function subjectPerformance(questions: SnapshotQuestionRecord[]): SubjectPerformance[] {
  const subjects = new Map<string, SubjectPerformance>();
  for (const question of questions) {
    const subject = subjects.get(question.subjectSlug) ?? {
      name: question.subjectName,
      slug: question.subjectSlug,
      order: question.subjectOrder,
      attempted: 0,
      correct: 0,
      incorrect: 0,
      accuracy: null,
      score: 0,
      maximumMarks: 0,
    };
    subject.maximumMarks += question.positiveMarks;
    subject.score += question.marksAwarded ?? 0;
    if (question.isCorrect === true) {
      subject.attempted += 1;
      subject.correct += 1;
    } else if (question.isCorrect === false) {
      subject.attempted += 1;
      subject.incorrect += 1;
    }
    subjects.set(question.subjectSlug, subject);
  }

  return [...subjects.values()]
    .map((subject) => ({ ...subject, accuracy: accuracy(subject.correct, subject.attempted) }))
    .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
}

function chapterPerformance(questions: SnapshotQuestionRecord[]): ChapterPerformance[] {
  const chapters = new Map<string, Omit<ChapterPerformance, "accuracy">>();
  for (const question of questions) {
    if (question.isCorrect === null) continue;
    const key = `${question.subjectSlug}:${question.chapterSlug}`;
    const chapter = chapters.get(key) ?? {
      name: question.chapterName,
      slug: question.chapterSlug,
      subjectName: question.subjectName,
      subjectSlug: question.subjectSlug,
      attempted: 0,
      correct: 0,
      incorrect: 0,
    };
    chapter.attempted += 1;
    if (question.isCorrect) chapter.correct += 1;
    else chapter.incorrect += 1;
    chapters.set(key, chapter);
  }

  return [...chapters.values()]
    .map((chapter) => ({
      ...chapter,
      accuracy: Math.round((chapter.correct / chapter.attempted) * 100),
    }))
    .sort((left, right) => right.attempted - left.attempted || right.accuracy - left.accuracy);
}

function attemptHref(type: AnalyticsAttemptType, id: string) {
  return type === "PRACTICE" ? `/practice/attempt/${id}` : `/mock-tests/attempt/${id}`;
}

export function calculateDashboardAnalytics(input: DashboardAnalyticsInput): DashboardAnalytics {
  const evaluated = input.questions.filter((question) => question.isCorrect !== null);
  const correct = evaluated.filter((question) => question.isCorrect).length;
  const incorrect = evaluated.length - correct;
  const modes = [
    modePerformance("PRACTICE", input),
    modePerformance("MOCK_EXAM", input),
  ];
  const subjects = subjectPerformance(input.questions);
  const allChapters = chapterPerformance(input.questions);
  const eligibleFocusAreas = allChapters.filter(
    (chapter) => chapter.attempted >= MIN_FOCUS_AREA_QUESTIONS,
  );
  const focusAreas = eligibleFocusAreas
    .filter((chapter) => chapter.accuracy < FOCUS_AREA_ACCURACY_THRESHOLD)
    .sort((left, right) => left.accuracy - right.accuracy || right.attempted - left.attempted)
    .slice(0, 3);
  const strongestArea = eligibleFocusAreas
    .filter((chapter) => chapter.accuracy >= STRONG_AREA_ACCURACY_THRESHOLD)
    .sort((left, right) => right.accuracy - left.accuracy || right.attempted - left.attempted)[0]
    ?? null;

  return {
    hasCompletedActivity: input.terminalAttempts.length > 0,
    overview: {
      attempted: evaluated.length,
      correct,
      incorrect,
      accuracy: accuracy(correct, evaluated.length),
      practiceSessions: modes[0].sessions,
      mockTests: modes[1].sessions,
    },
    modes,
    subjects,
    chapters: allChapters.filter(
      (chapter) => chapter.attempted >= MIN_CHAPTER_DISPLAY_QUESTIONS,
    ),
    focusAreas,
    focusAreaState: focusAreas.length > 0
      ? "AVAILABLE"
      : eligibleFocusAreas.length > 0
        ? "NO_WEAK_AREAS"
        : "INSUFFICIENT_DATA",
    strongestArea,
    recentActivity: input.recentAttempts.map((attempt) => ({
      ...attempt,
      href: attemptHref(attempt.type, attempt.id),
      isActive: attempt.status === "IN_PROGRESS",
    })),
    activeAttempts: input.activeAttempts.map((attempt) => ({
      id: attempt.id,
      type: attempt.type,
      name: attempt.name,
      href: attemptHref(attempt.type, attempt.id),
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      currentQuestion: Math.min(attempt.currentQuestionIndex + 1, attempt.totalQuestions),
      totalQuestions: attempt.totalQuestions,
      progress: attempt.totalQuestions === 0
        ? 0
        : Math.round(((attempt.currentQuestionIndex + 1) / attempt.totalQuestions) * 100),
    })),
    trend: [...input.trendAttempts]
      .reverse()
      .filter((attempt): attempt is typeof attempt & { completedAt: string } => Boolean(attempt.completedAt))
      .map((attempt) => ({
        id: attempt.id,
        type: attempt.type,
        name: attempt.name,
        completedAt: attempt.completedAt,
        accuracy: attempt.accuracy,
      })),
  };
}
