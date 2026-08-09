export type AnalyticsAttemptType = "PRACTICE" | "MOCK_EXAM";
export type AnalyticsAttemptStatus = "IN_PROGRESS" | "COMPLETED" | "EXPIRED";

export type TerminalAttemptRecord = {
  id: string;
  type: AnalyticsAttemptType;
  score: number;
  maximumMarks: number;
};

export type SnapshotQuestionRecord = {
  attemptId: string;
  attemptType: AnalyticsAttemptType;
  subjectName: string;
  subjectSlug: string;
  subjectOrder: number;
  chapterName: string;
  chapterSlug: string;
  positiveMarks: number;
  marksAwarded: number | null;
  isCorrect: boolean | null;
};

export type ActivityAttemptRecord = {
  id: string;
  type: AnalyticsAttemptType;
  status: AnalyticsAttemptStatus;
  name: string;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
  expiresAt: string | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  attemptedQuestions: number;
  correct: number;
  incorrect: number;
  score: number;
  maximumMarks: number;
  accuracy: number;
};

export type TrendAttemptRecord = Pick<
  ActivityAttemptRecord,
  "id" | "type" | "name" | "completedAt" | "accuracy" | "attemptedQuestions"
>;

export type DashboardAnalyticsInput = {
  terminalAttempts: TerminalAttemptRecord[];
  questions: SnapshotQuestionRecord[];
  recentAttempts: ActivityAttemptRecord[];
  activeAttempts: ActivityAttemptRecord[];
  trendAttempts: TrendAttemptRecord[];
};

export type AccuracyMetric = number | null;

export type OverviewMetrics = {
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: AccuracyMetric;
  practiceSessions: number;
  mockTests: number;
};

export type ModePerformance = {
  type: AnalyticsAttemptType;
  sessions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: AccuracyMetric;
  score: number;
  maximumMarks: number;
};

export type SubjectPerformance = {
  name: string;
  slug: string;
  order: number;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: AccuracyMetric;
  score: number;
  maximumMarks: number;
};

export type ChapterPerformance = {
  name: string;
  slug: string;
  subjectName: string;
  subjectSlug: string;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number;
};

export type RecentActivity = ActivityAttemptRecord & {
  href: string;
  isActive: boolean;
};

export type ActiveAttempt = {
  id: string;
  type: AnalyticsAttemptType;
  name: string;
  href: string;
  startedAt: string;
  expiresAt: string | null;
  currentQuestion: number;
  totalQuestions: number;
  progress: number;
};

export type TrendPoint = {
  id: string;
  type: AnalyticsAttemptType;
  name: string;
  completedAt: string;
  accuracy: number;
};

export type FocusAreaState = "AVAILABLE" | "INSUFFICIENT_DATA" | "NO_WEAK_AREAS";

export type DashboardAnalytics = {
  hasCompletedActivity: boolean;
  overview: OverviewMetrics;
  modes: ModePerformance[];
  subjects: SubjectPerformance[];
  chapters: ChapterPerformance[];
  focusAreas: ChapterPerformance[];
  focusAreaState: FocusAreaState;
  strongestArea: ChapterPerformance | null;
  recentActivity: RecentActivity[];
  activeAttempts: ActiveAttempt[];
  trend: TrendPoint[];
};
