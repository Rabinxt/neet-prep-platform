import "server-only";
import { getPrisma } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/session";
import {
  calculateAdminAnalytics,
  getUtcWeekBounds,
  type AdminAttemptStatus,
  type AdminChapterAggregate,
  type AdminDifficulty,
  type AdminIncorrectQuestionAggregate,
  type AdminRecentAttemptInput,
  type AdminStudentAggregate,
  type AdminSubjectAggregate,
} from "@/server/admin/analytics-calculate";

const terminalStatuses = ["COMPLETED", "EXPIRED"] as const;

type CountRow = { count: number };

export async function getAdminAnalytics(now = new Date()) {
  await requireAdmin();
  const prisma = getPrisma();
  const week = getUtcWeekBounds(now);

  const [
    attemptsThisWeek,
    attemptsPreviousWeek,
    activeStudentRows,
    statusRows,
    chapterRows,
    subjectRows,
    difficultyRows,
    mostActiveStudents,
    recentAttempts,
    incorrectQuestions,
  ] = await Promise.all([
    prisma.attempt.count({
      where: { startedAt: { gte: week.currentStart, lt: week.currentEnd } },
    }),
    prisma.attempt.count({
      where: { startedAt: { gte: week.previousStart, lt: week.previousEnd } },
    }),
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(DISTINCT "userId")::int AS count
      FROM "Attempt"
      WHERE "userId" IS NOT NULL
        AND "status" <> 'ABANDONED'
        AND "startedAt" >= ${week.currentStart}
        AND "startedAt" < ${week.currentEnd}
    `,
    prisma.attempt.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.$queryRaw<AdminChapterAggregate[]>`
      SELECT
        aq."chapterName",
        aq."chapterSlug",
        aq."subjectName",
        aq."subjectSlug",
        COUNT(DISTINCT aq."attemptId")::int AS "attemptCount",
        COUNT(*)::int AS answered,
        COUNT(*) FILTER (WHERE aq."isCorrect" = true)::int AS correct
      FROM "AttemptQuestion" aq
      INNER JOIN "Attempt" a ON a.id = aq."attemptId"
      WHERE a.status IN ('COMPLETED', 'EXPIRED')
        AND aq."isCorrect" IS NOT NULL
      GROUP BY aq."chapterName", aq."chapterSlug", aq."subjectName", aq."subjectSlug"
      ORDER BY "attemptCount" DESC, answered DESC
      LIMIT 50
    `,
    prisma.$queryRaw<AdminSubjectAggregate[]>`
      SELECT
        aq."subjectName",
        aq."subjectSlug",
        COUNT(DISTINCT aq."attemptId")::int AS "attemptCount",
        COUNT(*)::int AS answered
      FROM "AttemptQuestion" aq
      INNER JOIN "Attempt" a ON a.id = aq."attemptId"
      WHERE a.status IN ('COMPLETED', 'EXPIRED')
        AND aq."isCorrect" IS NOT NULL
      GROUP BY aq."subjectName", aq."subjectSlug"
      ORDER BY "attemptCount" DESC, answered DESC
    `,
    prisma.attemptQuestion.groupBy({
      by: ["difficulty"],
      where: {
        isCorrect: { not: null },
        attempt: { status: { in: [...terminalStatuses] } },
      },
      _count: { _all: true },
    }),
    prisma.$queryRaw<AdminStudentAggregate[]>`
      SELECT
        u.id AS "userId",
        u.name,
        COUNT(*)::int AS "attemptCount"
      FROM "Attempt" a
      INNER JOIN "User" u ON u.id = a."userId"
      WHERE a.status <> 'ABANDONED'
      GROUP BY u.id, u.name
      ORDER BY "attemptCount" DESC, u.name ASC
      LIMIT 10
    `,
    prisma.attempt.findMany({
      where: { status: { not: "ABANDONED" } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        status: true,
        name: true,
        startedAt: true,
        completedAt: true,
        updatedAt: true,
        attemptedQuestions: true,
        totalQuestions: true,
        accuracy: true,
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.$queryRaw<AdminIncorrectQuestionAggregate[]>`
      SELECT
        aq."sourceQuestionId",
        aq."questionText",
        aq."subjectName",
        aq."subjectSlug",
        aq."chapterName",
        COUNT(*)::int AS answered,
        COUNT(*) FILTER (WHERE aq."isCorrect" = false)::int AS incorrect
      FROM "AttemptQuestion" aq
      INNER JOIN "Attempt" a ON a.id = aq."attemptId"
      WHERE a.status IN ('COMPLETED', 'EXPIRED')
        AND aq."isCorrect" IS NOT NULL
      GROUP BY aq."sourceQuestionId", aq."questionText", aq."subjectName", aq."subjectSlug", aq."chapterName"
      HAVING COUNT(*) >= 3
      ORDER BY (COUNT(*) FILTER (WHERE aq."isCorrect" = false))::float / COUNT(*) DESC, answered DESC
      LIMIT 10
    `,
  ]);

  return calculateAdminAnalytics({
    week,
    attemptsThisWeek,
    attemptsPreviousWeek,
    activeStudentsThisWeek: activeStudentRows[0]?.count ?? 0,
    statusCounts: statusRows.map((row) => ({
      status: row.status as AdminAttemptStatus,
      count: row._count._all,
    })),
    chapters: chapterRows,
    subjects: subjectRows,
    difficultyCounts: difficultyRows.map((row) => ({
      difficulty: row.difficulty as AdminDifficulty,
      count: row._count._all,
    })),
    activeStudents: mostActiveStudents,
    recentAttempts: recentAttempts.map((attempt): AdminRecentAttemptInput => ({
      ...attempt,
      status: attempt.status as AdminRecentAttemptInput["status"],
    })),
    incorrectQuestions,
  });
}
