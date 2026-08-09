import assert from "node:assert/strict";
import test from "node:test";
import { calculateDashboardAnalytics } from "@/server/analytics/calculate";
import type {
  ActivityAttemptRecord,
  DashboardAnalyticsInput,
  SnapshotQuestionRecord,
  TerminalAttemptRecord,
} from "@/server/analytics/types";

const emptyInput = (): DashboardAnalyticsInput => ({
  terminalAttempts: [],
  questions: [],
  recentAttempts: [],
  activeAttempts: [],
  trendAttempts: [],
});

function attempt(overrides: Partial<TerminalAttemptRecord> = {}): TerminalAttemptRecord {
  return { id: "attempt-1", type: "PRACTICE", score: 4, maximumMarks: 4, ...overrides };
}

function question(overrides: Partial<SnapshotQuestionRecord> = {}): SnapshotQuestionRecord {
  return {
    attemptId: "attempt-1",
    attemptType: "PRACTICE",
    subjectName: "Physics",
    subjectSlug: "physics",
    subjectOrder: 1,
    chapterName: "Historical Mechanics",
    chapterSlug: "historical-mechanics",
    positiveMarks: 4,
    marksAwarded: 4,
    isCorrect: true,
    ...overrides,
  };
}

function activity(overrides: Partial<ActivityAttemptRecord> = {}): ActivityAttemptRecord {
  return {
    id: "activity-1",
    type: "PRACTICE",
    status: "COMPLETED",
    name: "Physics practice",
    startedAt: "2026-01-01T08:00:00.000Z",
    completedAt: "2026-01-01T08:10:00.000Z",
    updatedAt: "2026-01-01T08:10:00.000Z",
    expiresAt: null,
    currentQuestionIndex: 0,
    totalQuestions: 5,
    attemptedQuestions: 1,
    correct: 1,
    incorrect: 0,
    score: 4,
    maximumMarks: 20,
    accuracy: 100,
    ...overrides,
  };
}

test("empty new-user dashboard avoids false zero-percent conclusions", () => {
  const result = calculateDashboardAnalytics(emptyInput());
  assert.equal(result.hasCompletedActivity, false);
  assert.equal(result.overview.accuracy, null);
  assert.equal(result.subjects.length, 0);
  assert.equal(result.focusAreaState, "INSUFFICIENT_DATA");
});

test("single completed Practice counts checked answers but not unchecked questions", () => {
  const input = emptyInput();
  input.terminalAttempts = [attempt()];
  input.questions = [question(), question({ isCorrect: null, marksAwarded: null })];
  const result = calculateDashboardAnalytics(input);
  assert.deepEqual(result.overview, {
    attempted: 1,
    correct: 1,
    incorrect: 0,
    accuracy: 100,
    practiceSessions: 1,
    mockTests: 0,
  });
  assert.equal(result.subjects[0].maximumMarks, 8);
});

test("multiple Practice attempts aggregate without counting sessions twice", () => {
  const input = emptyInput();
  input.terminalAttempts = [attempt(), attempt({ id: "attempt-2", score: -1 })];
  input.questions = [question(), question({ attemptId: "attempt-2", isCorrect: false, marksAwarded: -1 })];
  const result = calculateDashboardAnalytics(input);
  assert.equal(result.overview.practiceSessions, 2);
  assert.equal(result.overview.attempted, 2);
  assert.equal(result.overview.accuracy, 50);
});

test("completed Mock Tests remain separate and retain negative marking", () => {
  const input = emptyInput();
  input.terminalAttempts = [attempt({ type: "MOCK_EXAM", score: -1, maximumMarks: 4 })];
  input.questions = [question({ attemptType: "MOCK_EXAM", isCorrect: false, marksAwarded: -1 })];
  const result = calculateDashboardAnalytics(input);
  const mock = result.modes.find((mode) => mode.type === "MOCK_EXAM")!;
  assert.equal(result.overview.mockTests, 1);
  assert.equal(mock.score, -1);
  assert.equal(mock.maximumMarks, 4);
  assert.equal(mock.incorrect, 1);
});

test("Physics, Chemistry, and Biology use independent snapshot aggregation", () => {
  const input = emptyInput();
  input.terminalAttempts = [attempt({ maximumMarks: 16 })];
  input.questions = [
    question(),
    question({ subjectName: "Chemistry", subjectSlug: "chemistry", subjectOrder: 2, chapterName: "Atoms", chapterSlug: "atoms", isCorrect: false, marksAwarded: -1 }),
    question({ subjectName: "Biology", subjectSlug: "biology", subjectOrder: 3, chapterName: "Cells", chapterSlug: "cells" }),
    question({ subjectName: "Biology", subjectSlug: "biology", subjectOrder: 3, chapterName: "Cells", chapterSlug: "cells", isCorrect: false, marksAwarded: -1 }),
  ];
  const result = calculateDashboardAnalytics(input);
  assert.deepEqual(result.subjects.map((subject) => [subject.slug, subject.accuracy]), [
    ["physics", 100],
    ["chemistry", 0],
    ["biology", 50],
  ]);
});

test("subject and chapter accuracy use correct divided by answered", () => {
  const input = emptyInput();
  input.terminalAttempts = [attempt({ maximumMarks: 12 })];
  input.questions = [question(), question({ isCorrect: true }), question({ isCorrect: false, marksAwarded: -1 })];
  const result = calculateDashboardAnalytics(input);
  assert.equal(result.subjects[0].accuracy, 67);
  assert.equal(result.chapters[0].accuracy, 67);
});

test("weak-area logic requires three answers and less than sixty percent accuracy", () => {
  const input = emptyInput();
  input.terminalAttempts = [attempt({ maximumMarks: 16 })];
  input.questions = [
    question(),
    question({ isCorrect: false, marksAwarded: -1 }),
    question({ isCorrect: false, marksAwarded: -1 }),
    question({ chapterName: "One-question chapter", chapterSlug: "one-question", isCorrect: false, marksAwarded: -1 }),
  ];
  const result = calculateDashboardAnalytics(input);
  assert.equal(result.focusAreaState, "AVAILABLE");
  assert.equal(result.focusAreas.length, 1);
  assert.equal(result.focusAreas[0].name, "Historical Mechanics");
  assert.equal(result.focusAreas[0].accuracy, 33);
});

test("insufficient evidence never creates a weak area", () => {
  const input = emptyInput();
  input.terminalAttempts = [attempt({ maximumMarks: 8 })];
  input.questions = [question({ isCorrect: false, marksAwarded: -1 }), question({ isCorrect: false, marksAwarded: -1 })];
  const result = calculateDashboardAnalytics(input);
  assert.equal(result.focusAreas.length, 0);
  assert.equal(result.focusAreaState, "INSUFFICIENT_DATA");
});

test("recent activity preserves query ordering and creates secure route shapes", () => {
  const input = emptyInput();
  input.recentAttempts = [
    activity({ id: "newer", type: "MOCK_EXAM" }),
    activity({ id: "older", type: "PRACTICE" }),
  ];
  const result = calculateDashboardAnalytics(input);
  assert.deepEqual(result.recentActivity.map((item) => item.id), ["newer", "older"]);
  assert.equal(result.recentActivity[0].href, "/mock-tests/attempt/newer");
});

test("active attempts expose resumable progress without affecting completed metrics", () => {
  const input = emptyInput();
  input.activeAttempts = [activity({ id: "active", status: "IN_PROGRESS", completedAt: null, currentQuestionIndex: 1 })];
  const result = calculateDashboardAnalytics(input);
  assert.equal(result.hasCompletedActivity, false);
  assert.deepEqual(result.activeAttempts[0], {
    id: "active",
    type: "PRACTICE",
    name: "Physics practice",
    href: "/practice/attempt/active",
    startedAt: "2026-01-01T08:00:00.000Z",
    expiresAt: null,
    currentQuestion: 2,
    totalQuestions: 5,
    progress: 40,
  });
});

test("trend is chronological and historical labels come only from snapshots", () => {
  const input = emptyInput();
  input.terminalAttempts = [attempt()];
  input.questions = [
    question({ chapterName: "Deleted live chapter", chapterSlug: "deleted-live-chapter" }),
    question({ chapterName: "Deleted live chapter", chapterSlug: "deleted-live-chapter" }),
  ];
  input.trendAttempts = [
    { id: "new", type: "MOCK_EXAM", name: "New", completedAt: "2026-01-03T00:00:00.000Z", accuracy: 80, attemptedQuestions: 5 },
    { id: "old", type: "PRACTICE", name: "Old", completedAt: "2026-01-01T00:00:00.000Z", accuracy: 40, attemptedQuestions: 5 },
  ];
  const result = calculateDashboardAnalytics(input);
  assert.deepEqual(result.trend.map((point) => point.id), ["old", "new"]);
  assert.equal(result.chapters[0].name, "Deleted live chapter");
  assert.equal(result.subjects[0].name, "Physics");
});
