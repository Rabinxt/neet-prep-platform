import { getPrisma } from "@/server/db/client";
import { calculateDashboardAnalytics } from "@/server/analytics/calculate";
import type {
  ActivityAttemptRecord,
  AnalyticsAttemptStatus,
  DashboardAnalytics,
  SnapshotQuestionRecord,
  TrendAttemptRecord,
} from "@/server/analytics/types";

const terminalStatuses = ["COMPLETED", "EXPIRED"] as const;
const visibleStatuses = ["IN_PROGRESS", ...terminalStatuses] as const;

const activitySelect = {
  id: true,
  type: true,
  status: true,
  name: true,
  startedAt: true,
  completedAt: true,
  updatedAt: true,
  expiresAt: true,
  currentQuestionIndex: true,
  totalQuestions: true,
  attemptedQuestions: true,
  correct: true,
  incorrect: true,
  score: true,
  maximumMarks: true,
  accuracy: true,
} as const;

function toActivityRecord(attempt: {
  id: string;
  type: "PRACTICE" | "MOCK_EXAM";
  status: AnalyticsAttemptStatus | "ABANDONED";
  name: string;
  startedAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
  expiresAt: Date | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  attemptedQuestions: number;
  correct: number;
  incorrect: number;
  score: number;
  maximumMarks: number;
  accuracy: number;
}): ActivityAttemptRecord {
  if (attempt.status === "ABANDONED") {
    throw new Error("Abandoned attempts cannot be shown in dashboard activity.");
  }
  return {
    ...attempt,
    status: attempt.status,
    startedAt: attempt.startedAt.toISOString(),
    completedAt: attempt.completedAt?.toISOString() ?? null,
    updatedAt: attempt.updatedAt.toISOString(),
    expiresAt: attempt.expiresAt?.toISOString() ?? null,
  };
}

export async function getDashboardAnalyticsForUser(userId: string): Promise<DashboardAnalytics> {
  const prisma = getPrisma();
  const now = new Date();
  const activeWhere = {
    userId,
    status: "IN_PROGRESS" as const,
    OR: [
      { type: "PRACTICE" as const },
      { type: "MOCK_EXAM" as const, expiresAt: { gt: now } },
    ],
  };

  const [terminalAttempts, questionSnapshots, recentAttempts, activeAttempts, trendAttempts] = await Promise.all([
    prisma.attempt.findMany({
      where: { userId, status: { in: [...terminalStatuses] } },
      select: { id: true, type: true, score: true, maximumMarks: true },
    }),
    prisma.attemptQuestion.findMany({
      where: { attempt: { userId, status: { in: [...terminalStatuses] } } },
      select: {
        attemptId: true,
        subjectName: true,
        subjectSlug: true,
        subjectOrder: true,
        chapterName: true,
        chapterSlug: true,
        positiveMarks: true,
        marksAwarded: true,
        isCorrect: true,
        attempt: { select: { type: true } },
      },
    }),
    prisma.attempt.findMany({
      where: {
        userId,
        status: { in: [...visibleStatuses] },
        NOT: {
          type: "MOCK_EXAM",
          status: "IN_PROGRESS",
          expiresAt: { lte: now },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: activitySelect,
    }),
    prisma.attempt.findMany({
      where: activeWhere,
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: activitySelect,
    }),
    prisma.attempt.findMany({
      where: {
        userId,
        status: { in: [...terminalStatuses] },
        attemptedQuestions: { gt: 0 },
      },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: {
        id: true,
        type: true,
        name: true,
        completedAt: true,
        accuracy: true,
        attemptedQuestions: true,
      },
    }),
  ]);

  return calculateDashboardAnalytics({
    terminalAttempts,
    questions: questionSnapshots.map((question): SnapshotQuestionRecord => ({
      attemptId: question.attemptId,
      attemptType: question.attempt.type,
      subjectName: question.subjectName,
      subjectSlug: question.subjectSlug,
      subjectOrder: question.subjectOrder,
      chapterName: question.chapterName,
      chapterSlug: question.chapterSlug,
      positiveMarks: question.positiveMarks,
      marksAwarded: question.marksAwarded,
      isCorrect: question.isCorrect,
    })),
    recentAttempts: recentAttempts.map(toActivityRecord),
    activeAttempts: activeAttempts.map(toActivityRecord),
    trendAttempts: trendAttempts.map((attempt): TrendAttemptRecord => ({
      ...attempt,
      completedAt: attempt.completedAt?.toISOString() ?? null,
    })),
  });
}
