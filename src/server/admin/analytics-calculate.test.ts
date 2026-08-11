import assert from "node:assert/strict";
import test from "node:test";
import { calculateAdminAnalytics, getUtcWeekBounds, type AdminAnalyticsInput } from "@/server/admin/analytics-calculate";

function input(overrides: Partial<AdminAnalyticsInput> = {}): AdminAnalyticsInput {
  return {
    week: getUtcWeekBounds(new Date("2026-08-12T10:30:00.000Z")),
    attemptsThisWeek: 0,
    attemptsPreviousWeek: 0,
    activeStudentsThisWeek: 0,
    statusCounts: [],
    chapters: [],
    subjects: [],
    difficultyCounts: [],
    activeStudents: [],
    recentAttempts: [],
    incorrectQuestions: [],
    ...overrides,
  };
}

test("UTC calendar weeks begin on Monday and expose a comparable previous week", () => {
  const week = getUtcWeekBounds(new Date("2026-08-12T10:30:00.000Z"));
  assert.equal(week.currentStart.toISOString(), "2026-08-10T00:00:00.000Z");
  assert.equal(week.currentEnd.toISOString(), "2026-08-17T00:00:00.000Z");
  assert.equal(week.previousStart.toISOString(), "2026-08-03T00:00:00.000Z");
  assert.equal(week.previousEnd.toISOString(), "2026-08-10T00:00:00.000Z");
});

test("no attempts produces an intentional empty analytics state and no false percentages", () => {
  const result = calculateAdminAnalytics(input());
  assert.equal(result.hasCompletedActivity, false);
  assert.equal(result.hero.completionRate, null);
  assert.equal(result.hero.change, 0);
  assert.deepEqual(result.difficulty.map((item) => item.share), [0, 0, 0]);
});

test("completion includes completed and expired attempts but excludes in-progress from the denominator", () => {
  const result = calculateAdminAnalytics(input({
    statusCounts: [
      { status: "COMPLETED", count: 3 },
      { status: "EXPIRED", count: 1 },
      { status: "ABANDONED", count: 1 },
      { status: "IN_PROGRESS", count: 8 },
    ],
  }));
  assert.equal(result.hasCompletedActivity, true);
  assert.equal(result.hero.completionRate, 80);
});

test("the database-provided distinct student count is preserved", () => {
  const result = calculateAdminAnalytics(input({ activeStudentsThisWeek: 2 }));
  assert.equal(result.hero.activeStudentsThisWeek, 2);
});

test("chapters rank by distinct attempt volume and calculate answered-question accuracy", () => {
  const result = calculateAdminAnalytics(input({
    statusCounts: [{ status: "COMPLETED", count: 1 }],
    chapters: [
      { chapterName: "Cells", chapterSlug: "cells", subjectName: "Biology", subjectSlug: "biology", attemptCount: 3, answered: 4, correct: 3 },
      { chapterName: "Motion", chapterSlug: "motion", subjectName: "Physics", subjectSlug: "physics", attemptCount: 8, answered: 10, correct: 4 },
    ],
  }));
  assert.deepEqual(result.chapterVolume.map((item) => item.chapterSlug), ["motion", "cells"]);
  assert.deepEqual(result.chapterVolume.map((item) => item.accuracy), [40, 75]);
  assert.deepEqual(result.chapterAccuracy.map((item) => item.chapterSlug), ["motion", "cells"]);
});

test("difficulty counts form a meaningful whole including absent groups", () => {
  const result = calculateAdminAnalytics(input({
    difficultyCounts: [
      { difficulty: "EASY", count: 2 },
      { difficulty: "HARD", count: 1 },
    ],
  }));
  assert.deepEqual(result.difficulty, [
    { difficulty: "EASY", count: 2, share: 67 },
    { difficulty: "MEDIUM", count: 0, share: 0 },
    { difficulty: "HARD", count: 1, share: 33 },
  ]);
});

test("incorrect-question ranking handles zero denominators and sorts by actual rate", () => {
  const result = calculateAdminAnalytics(input({
    incorrectQuestions: [
      { sourceQuestionId: "q1", questionText: "One", subjectName: "Physics", subjectSlug: "physics", chapterName: "Motion", answered: 4, incorrect: 2 },
      { sourceQuestionId: "q2", questionText: "Two", subjectName: "Biology", subjectSlug: "biology", chapterName: "Cells", answered: 0, incorrect: 0 },
      { sourceQuestionId: "q3", questionText: "Three", subjectName: "Chemistry", subjectSlug: "chemistry", chapterName: "Atoms", answered: 3, incorrect: 2 },
    ],
  }));
  assert.deepEqual(result.incorrectQuestions.map((item) => [item.sourceQuestionId, item.incorrectRate]), [["q3", 67], ["q1", 50]]);
});
