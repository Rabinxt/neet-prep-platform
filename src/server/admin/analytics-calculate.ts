export type AdminAttemptStatus = "IN_PROGRESS" | "COMPLETED" | "EXPIRED" | "ABANDONED";
export type AdminDifficulty = "EASY" | "MEDIUM" | "HARD";

export type AdminChapterAggregate = {
  chapterName: string;
  chapterSlug: string;
  subjectName: string;
  subjectSlug: string;
  attemptCount: number;
  answered: number;
  correct: number;
};

export type AdminSubjectAggregate = {
  subjectName: string;
  subjectSlug: string;
  attemptCount: number;
  answered: number;
};

export type AdminStudentAggregate = {
  userId: string;
  name: string;
  attemptCount: number;
};

export type AdminIncorrectQuestionAggregate = {
  sourceQuestionId: string | null;
  questionText: string;
  subjectName: string;
  subjectSlug: string;
  chapterName: string;
  answered: number;
  incorrect: number;
};

export type AdminRecentAttemptInput = {
  id: string;
  type: "PRACTICE" | "MOCK_EXAM";
  status: Exclude<AdminAttemptStatus, "ABANDONED">;
  name: string;
  startedAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
  attemptedQuestions: number;
  totalQuestions: number;
  accuracy: number;
  user: { id: string; name: string } | null;
};

export type AdminAnalyticsInput = {
  week: ReturnType<typeof getUtcWeekBounds>;
  attemptsThisWeek: number;
  attemptsPreviousWeek: number;
  activeStudentsThisWeek: number;
  statusCounts: Array<{ status: AdminAttemptStatus; count: number }>;
  chapters: AdminChapterAggregate[];
  subjects: AdminSubjectAggregate[];
  difficultyCounts: Array<{ difficulty: AdminDifficulty; count: number }>;
  activeStudents: AdminStudentAggregate[];
  recentAttempts: AdminRecentAttemptInput[];
  incorrectQuestions: AdminIncorrectQuestionAggregate[];
};

export type AdminAnalytics = {
  hasCompletedActivity: boolean;
  week: {
    currentStart: string;
    currentEnd: string;
    previousStart: string;
    previousEnd: string;
  };
  hero: {
    attemptsThisWeek: number;
    attemptsPreviousWeek: number;
    change: number | null;
    activeStudentsThisWeek: number;
    completionRate: number | null;
  };
  chapterVolume: Array<AdminChapterAggregate & { accuracy: number }>;
  chapterAccuracy: Array<AdminChapterAggregate & { accuracy: number }>;
  subjects: AdminSubjectAggregate[];
  difficulty: Array<{ difficulty: AdminDifficulty; count: number; share: number }>;
  activeStudents: AdminStudentAggregate[];
  recentAttempts: Array<Omit<AdminRecentAttemptInput, "startedAt" | "completedAt" | "updatedAt"> & {
    startedAt: string;
    completedAt: string | null;
    updatedAt: string;
  }>;
  incorrectQuestions: Array<AdminIncorrectQuestionAggregate & { incorrectRate: number }>;
};

const terminalStatuses = new Set<AdminAttemptStatus>(["COMPLETED", "EXPIRED"]);

function percentage(numerator: number, denominator: number) {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 100);
}

export function getUtcWeekBounds(now: Date) {
  const currentStart = new Date(now);
  currentStart.setUTCHours(0, 0, 0, 0);
  const daysSinceMonday = (currentStart.getUTCDay() + 6) % 7;
  currentStart.setUTCDate(currentStart.getUTCDate() - daysSinceMonday);

  const currentEnd = new Date(currentStart);
  currentEnd.setUTCDate(currentEnd.getUTCDate() + 7);
  const previousStart = new Date(currentStart);
  previousStart.setUTCDate(previousStart.getUTCDate() - 7);

  return { currentStart, currentEnd, previousStart, previousEnd: currentStart };
}

export function calculateAdminAnalytics(input: AdminAnalyticsInput): AdminAnalytics {
  const statusCount = new Map(input.statusCounts.map((item) => [item.status, item.count]));
  const terminalAttempts = [...terminalStatuses].reduce((total, status) => total + (statusCount.get(status) ?? 0), 0);
  const resolvedAttempts = terminalAttempts + (statusCount.get("ABANDONED") ?? 0);
  const difficultyTotal = input.difficultyCounts.reduce((total, item) => total + item.count, 0);
  const difficultyCount = new Map(input.difficultyCounts.map((item) => [item.difficulty, item.count]));

  const chapterRows = input.chapters
    .filter((chapter) => chapter.answered > 0)
    .map((chapter) => ({
      ...chapter,
      accuracy: percentage(chapter.correct, chapter.answered) ?? 0,
    }));

  return {
    hasCompletedActivity: terminalAttempts > 0,
    week: {
      currentStart: input.week.currentStart.toISOString(),
      currentEnd: input.week.currentEnd.toISOString(),
      previousStart: input.week.previousStart.toISOString(),
      previousEnd: input.week.previousEnd.toISOString(),
    },
    hero: {
      attemptsThisWeek: input.attemptsThisWeek,
      attemptsPreviousWeek: input.attemptsPreviousWeek,
      change: input.attemptsPreviousWeek === 0
        ? input.attemptsThisWeek === 0 ? 0 : null
        : Math.round(((input.attemptsThisWeek - input.attemptsPreviousWeek) / input.attemptsPreviousWeek) * 100),
      activeStudentsThisWeek: input.activeStudentsThisWeek,
      completionRate: percentage(terminalAttempts, resolvedAttempts),
    },
    chapterVolume: [...chapterRows]
      .sort((left, right) => right.attemptCount - left.attemptCount || right.answered - left.answered || left.chapterName.localeCompare(right.chapterName))
      .slice(0, 10),
    chapterAccuracy: [...chapterRows]
      .filter((chapter) => chapter.answered >= 2)
      .sort((left, right) => left.accuracy - right.accuracy || right.answered - left.answered)
      .slice(0, 10),
    subjects: [...input.subjects]
      .sort((left, right) => right.attemptCount - left.attemptCount || left.subjectName.localeCompare(right.subjectName)),
    difficulty: (["EASY", "MEDIUM", "HARD"] as const).map((difficulty) => {
      const count = difficultyCount.get(difficulty) ?? 0;
      return { difficulty, count, share: percentage(count, difficultyTotal) ?? 0 };
    }),
    activeStudents: [...input.activeStudents]
      .sort((left, right) => right.attemptCount - left.attemptCount || left.name.localeCompare(right.name))
      .slice(0, 10),
    recentAttempts: input.recentAttempts.slice(0, 20).map((attempt) => ({
      ...attempt,
      startedAt: attempt.startedAt.toISOString(),
      completedAt: attempt.completedAt?.toISOString() ?? null,
      updatedAt: attempt.updatedAt.toISOString(),
    })),
    incorrectQuestions: input.incorrectQuestions
      .filter((question) => question.answered > 0)
      .map((question) => ({
        ...question,
        incorrectRate: percentage(question.incorrect, question.answered) ?? 0,
      }))
      .sort((left, right) => right.incorrectRate - left.incorrectRate || right.answered - left.answered)
      .slice(0, 10),
  };
}
