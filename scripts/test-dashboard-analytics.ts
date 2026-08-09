import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Prisma } from "../src/generated/prisma/client";
import { ANONYMOUS_ATTEMPT_COOKIE } from "../src/server/attempts/anonymous-session";
import { claimAnonymousAttemptsForUser } from "../src/server/attempts/claim";
import { getDashboardAnalyticsForUser } from "../src/server/analytics/dashboard";
import { getPrisma } from "../src/server/db/client";

const prisma = getPrisma();
const suffix = randomUUID();
const userIds: string[] = [];
const anonymousSessionIds: string[] = [];
const attemptIds: string[] = [];

type SnapshotSeed = {
  subjectName: string;
  subjectSlug: string;
  subjectOrder: number;
  chapterName: string;
  chapterSlug: string;
  isCorrect: boolean | null;
  marksAwarded: number | null;
};

async function createUser(label: string) {
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      name: `Analytics ${label}`,
      email: `analytics-${label.toLowerCase()}-${suffix}@example.test`,
      role: "STUDENT",
    },
  });
  userIds.push(user.id);
  return user;
}

async function createAttempt(input: {
  userId?: string;
  anonymousSessionId?: string;
  type: "PRACTICE" | "MOCK_EXAM";
  status: "IN_PROGRESS" | "COMPLETED";
  name: string;
  startedAt: Date;
  completedAt?: Date;
  questions: SnapshotSeed[];
}) {
  const attempted = input.questions.filter((question) => question.isCorrect !== null);
  const correct = attempted.filter((question) => question.isCorrect).length;
  const score = input.questions.reduce((total, question) => total + (question.marksAwarded ?? 0), 0);
  const data: Prisma.AttemptCreateInput = {
    user: input.userId ? { connect: { id: input.userId } } : undefined,
    anonymousSession: input.anonymousSessionId
      ? { connect: { id: input.anonymousSessionId } }
      : undefined,
    type: input.type,
    status: input.status,
    name: input.name,
    configuration: { analyticsTest: true },
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    totalQuestions: input.questions.length,
    attemptedQuestions: attempted.length,
    correct,
    incorrect: attempted.length - correct,
    unanswered: input.questions.length - attempted.length,
    score,
    maximumMarks: input.questions.length * 4,
    accuracy: attempted.length === 0 ? 0 : Math.round((correct / attempted.length) * 100),
    questions: {
      create: input.questions.map((question, index) => ({
        order: index + 1,
        questionText: `Analytics snapshot question ${index + 1}`,
        explanation: "Analytics integration fixture.",
        difficulty: "MEDIUM",
        sourceType: "SAMPLE",
        positiveMarks: 4,
        negativeMarks: 1,
        subjectName: question.subjectName,
        subjectSlug: question.subjectSlug,
        subjectOrder: question.subjectOrder,
        chapterName: question.chapterName,
        chapterSlug: question.chapterSlug,
        responseStatus: question.isCorrect === null ? "NOT_ANSWERED" : "ANSWERED",
        checkedAt: question.isCorrect === null ? null : input.completedAt ?? input.startedAt,
        isCorrect: question.isCorrect,
        marksAwarded: question.marksAwarded,
      })),
    },
  };
  const result = await prisma.attempt.create({ data, select: { id: true } });
  attemptIds.push(result.id);
  return result;
}

const physicsCorrect: SnapshotSeed = {
  subjectName: "Historical Physics",
  subjectSlug: "physics",
  subjectOrder: 1,
  chapterName: "Archived Mechanics",
  chapterSlug: "archived-mechanics",
  isCorrect: true,
  marksAwarded: 4,
};
const physicsIncorrect: SnapshotSeed = { ...physicsCorrect, isCorrect: false, marksAwarded: -1 };
const chemistryIncorrect: SnapshotSeed = {
  subjectName: "Historical Chemistry",
  subjectSlug: "chemistry",
  subjectOrder: 2,
  chapterName: "Archived Atomic Structure",
  chapterSlug: "archived-atomic-structure",
  isCorrect: false,
  marksAwarded: -1,
};
const biologyCorrect: SnapshotSeed = {
  subjectName: "Historical Biology",
  subjectSlug: "biology",
  subjectOrder: 3,
  chapterName: "Archived Cell Biology",
  chapterSlug: "archived-cell-biology",
  isCorrect: true,
  marksAwarded: 4,
};

try {
  const [userA, userB] = await Promise.all([createUser("A"), createUser("B")]);
  const base = Date.now() - 60_000;

  await createAttempt({
    userId: userA.id,
    type: "PRACTICE",
    status: "COMPLETED",
    name: "A historical practice",
    startedAt: new Date(base),
    completedAt: new Date(base + 5_000),
    questions: [physicsCorrect, physicsIncorrect, physicsIncorrect],
  });
  await createAttempt({
    userId: userA.id,
    type: "MOCK_EXAM",
    status: "COMPLETED",
    name: "A mixed mock",
    startedAt: new Date(base + 10_000),
    completedAt: new Date(base + 20_000),
    questions: [chemistryIncorrect, biologyCorrect],
  });
  const activeA = await createAttempt({
    userId: userA.id,
    type: "PRACTICE",
    status: "IN_PROGRESS",
    name: "A active practice",
    startedAt: new Date(base + 30_000),
    questions: [{ ...physicsCorrect, isCorrect: null, marksAwarded: null }],
  });
  await createAttempt({
    userId: userB.id,
    type: "PRACTICE",
    status: "COMPLETED",
    name: "B private practice",
    startedAt: new Date(base + 35_000),
    completedAt: new Date(base + 40_000),
    questions: [biologyCorrect, biologyCorrect],
  });

  const unrelatedToken = randomBytes(32).toString("base64url");
  const unrelatedSession = await prisma.anonymousSession.create({
    data: { tokenHash: createHash("sha256").update(unrelatedToken).digest("hex") },
  });
  anonymousSessionIds.push(unrelatedSession.id);
  await createAttempt({
    anonymousSessionId: unrelatedSession.id,
    type: "PRACTICE",
    status: "COMPLETED",
    name: "Unclaimed anonymous practice",
    startedAt: new Date(base + 42_000),
    completedAt: new Date(base + 43_000),
    questions: [physicsCorrect, physicsCorrect, physicsCorrect],
  });

  const beforeClaim = await getDashboardAnalyticsForUser(userA.id);
  assert.equal(beforeClaim.overview.attempted, 5, "Anonymous or another user's questions entered User A analytics.");
  assert.equal(beforeClaim.overview.practiceSessions, 1);
  assert.equal(beforeClaim.overview.mockTests, 1);
  assert.deepEqual(beforeClaim.subjects.map((subject) => subject.slug), ["physics", "chemistry", "biology"]);
  assert.equal(beforeClaim.subjects.find((subject) => subject.slug === "physics")?.accuracy, 33);
  assert.equal(beforeClaim.subjects.find((subject) => subject.slug === "chemistry")?.score, -1, "Negative marking changed in analytics.");
  assert.equal(beforeClaim.chapters.find((chapter) => chapter.slug === "archived-mechanics")?.name, "Archived Mechanics", "Historical snapshot labels were not used.");
  assert.equal(beforeClaim.focusAreas[0]?.slug, "archived-mechanics");
  assert.equal(beforeClaim.activeAttempts[0]?.id, activeA.id, "Active resume state was missing.");
  assert.equal(beforeClaim.recentActivity[0]?.id, activeA.id, "Recent activity was not newest-first.");

  const userBAnalytics = await getDashboardAnalyticsForUser(userB.id);
  assert.equal(userBAnalytics.overview.attempted, 2);
  assert(!userBAnalytics.recentActivity.some((item) => item.name.startsWith("A ")), "User B received User A activity.");

  const claimToken = randomBytes(32).toString("base64url");
  const claimSession = await prisma.anonymousSession.create({
    data: { tokenHash: createHash("sha256").update(claimToken).digest("hex") },
  });
  anonymousSessionIds.push(claimSession.id);
  const claimable = await createAttempt({
    anonymousSessionId: claimSession.id,
    type: "PRACTICE",
    status: "COMPLETED",
    name: "Claimable analytics practice",
    startedAt: new Date(base + 45_000),
    completedAt: new Date(base + 46_000),
    questions: [biologyCorrect],
  });
  const claimedCount = await claimAnonymousAttemptsForUser({
    userId: userA.id,
    requestHeaders: new Headers({ cookie: `${ANONYMOUS_ATTEMPT_COOKIE}=${claimToken}` }),
  });
  assert.equal(claimedCount, 1);

  const afterClaim = await getDashboardAnalyticsForUser(userA.id);
  assert.equal(afterClaim.overview.attempted, 6, "Claimed history did not enter authenticated analytics.");
  assert(afterClaim.recentActivity.some((item) => item.id === claimable.id));
  assert(!afterClaim.recentActivity.some((item) => item.name === "Unclaimed anonymous practice"));

  console.info("Dashboard analytics integration checks passed (ownership, claims, ordering, snapshots, and aggregation). ");
} finally {
  if (attemptIds.length > 0) await prisma.attempt.deleteMany({ where: { id: { in: attemptIds } } });
  if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  if (anonymousSessionIds.length > 0) {
    await prisma.anonymousSession.deleteMany({ where: { id: { in: anonymousSessionIds } } });
  }
  await prisma.$disconnect();
}
